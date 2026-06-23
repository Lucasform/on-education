import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgSchema,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * On Education vive num SCHEMA Postgres dedicado (`on_education`), isolado de outros
 * produtos que compartilhem o mesmo banco (ex.: On Way Financial em `public`). Todas as
 * tabelas e enums são criados aqui; o journal de migrations também (ver drizzle.config).
 */
export const oe = pgSchema('on_education');

/**
 * Schema base do produto (Master Spec §5). Toda tabela de domínio carrega `tenant_id`
 * e tem RLS habilitado. O isolamento multi-tenant é garantido por:
 *   tenant_id = current_setting('app.tenant_id', true)::uuid
 * O segundo argumento `true` faz a sessão sem tenant setado enxergar ZERO linhas
 * (default mais seguro) em vez de erro.
 *
 * Enums espelham os do @on-education/core; mudá-los exige migration, por isso ficam
 * declarados explicitamente aqui (camada de banco).
 */
export const tenantTypeEnum = oe.enum('tenant_type', ['organization', 'individual']);
export const roleEnum = oe.enum('role', [
  'owner',
  'director',
  'vice_director',
  'coordinator',
  'teacher',
  'monitor',
  'staff_secretary',
  'staff_finance',
  'guardian',
  'student',
]);

/**
 * Predicado RLS reutilizável: a linha pertence ao tenant da sessão.
 * `NULLIF(..., '')` trata GUC vazio como NULL → sessão sem tenant enxerga ZERO linhas
 * (default seguro) em vez de erro `invalid input syntax for uuid: ""`.
 */
const tenantPredicate = sql`tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`;

/** Colunas transversais (Master Spec §5). `tenantScoped` adiciona o tenant_id. */
const auditCols = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// ---------------------------------------------------------------------------
// tenants — a fronteira de isolamento. Para esta tabela, o próprio `id` é o tenant.
// ---------------------------------------------------------------------------
export const tenants = oe.table(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantType: tenantTypeEnum('tenant_type').notNull(),
    name: text('name').notNull(),
    // Slug público (link de marca): eduonway.com/c/<slug>. Único (case-insensitive via índice).
    slug: text('slug'),
    status: text('status').notNull().default('active'),
    // Marcação de CRM do super-admin: distingue cliente pagante de conta de teste/trial.
    isClient: boolean('is_client').notNull().default(false),
    // Tenant de SISTEMA (ex.: "Banco Geral" que recebe atividades de contas excluídas).
    // Fica fora das listas/contagens normais e não pode ser excluído.
    isSystem: boolean('is_system').notNull().default(false),
    // Opcional: rede de escolas à qual este tenant pertence (multi-escola).
    networkId: uuid('network_id'),
    // Ano letivo: início e fim para cálculo de dias letivos.
    schoolYearStart: date('school_year_start'),
    schoolYearEnd: date('school_year_end'),
    ...auditCols,
  },
  () => [
    pgPolicy('tenants_self_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`id = nullif(current_setting('app.tenant_id', true), '')::uuid`,
      withCheck: sql`id = nullif(current_setting('app.tenant_id', true), '')::uuid`,
    }),
  ],
);

// ---------------------------------------------------------------------------
// users — identidade global (um usuário pode ter membership em vários tenants).
// Não é tenant-scoped; o vínculo tenant↔user é a `memberships`.
// ---------------------------------------------------------------------------
export const users = oe.table(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
);

// ---------------------------------------------------------------------------
// memberships — User × Tenant × Role (× Unit no futuro). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const memberships = oe.table(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: roleEnum('role').notNull(),
    ...auditCols,
  },
  (t) => [
    index('memberships_tenant_idx').on(t.tenantId),
    uniqueIndex('memberships_tenant_user_role_uq').on(t.tenantId, t.userId, t.role),
    pgPolicy('memberships_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// plans — catálogo global de planos (não tenant-scoped). Ex.: teacher_free, school_full.
// ---------------------------------------------------------------------------
export const plans = oe.table('plans', {
  id: text('id').primaryKey(), // slug estável: 'teacher_free', 'school_full', ...
  name: text('name').notNull(),
  tenantType: tenantTypeEnum('tenant_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// subscriptions — assinatura do SaaS por tenant (quem paga pelo produto). RLS.
// ---------------------------------------------------------------------------
export const subscriptions = oe.table(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    planId: text('plan_id').notNull(),
    status: text('status').notNull().default('active'),
    ...auditCols,
  },
  (t) => [
    index('subscriptions_tenant_idx').on(t.tenantId),
    pgPolicy('subscriptions_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// entitlements — overrides/estado de entitlement por tenant (a fonte canônica do
// mapa plano→módulos vive em @on-education/entitlements). RLS.
// ---------------------------------------------------------------------------
export const entitlements = oe.table(
  'entitlements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    feature: text('feature').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    limits: jsonb('limits'),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('entitlements_tenant_feature_uq').on(t.tenantId, t.feature),
    pgPolicy('entitlements_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// usage_meters — cotas por período (ex.: tokens de IA/mês). RLS.
// ---------------------------------------------------------------------------
export const usageMeters = oe.table(
  'usage_meters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    metric: text('metric').notNull(),
    period: text('period').notNull(), // ex.: '2026-06'
    used: integer('used').notNull().default(0),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('usage_meters_tenant_metric_period_uq').on(t.tenantId, t.metric, t.period),
    pgPolicy('usage_meters_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// audit_log — trilha de auditoria (Master Spec §6.3). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const auditLog = oe.table(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    resource: text('resource').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('audit_log_tenant_idx').on(t.tenantId),
    pgPolicy('audit_log_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// classes — turmas (Fase 1B.1: turmas leves do professor autônomo; também serve
// à escola). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const classes = oe.table(
  'classes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // Item 3: série/ano (ex.: "6º ano") e faixa etária (ex.: "11-12 anos").
    gradeLevel: text('grade_level'),
    ageRange: text('age_range'),
    ...auditCols,
  },
  (t) => [
    index('classes_tenant_idx').on(t.tenantId),
    pgPolicy('classes_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// students — alunos do tenant (no individual, alunos particulares do professor).
// `full_name` é PII: nunca logar em claro (Master Spec §7.4). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const students = oe.table(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id'),
    fullName: text('full_name').notNull(),
    birthDate: date('birth_date'), // aniversariantes do mês + idade
    // Perfil completo (endereço)
    address: text('address'),
    city: text('city'),
    state: text('state'),
    zipCode: text('zip_code'),
    // Informações médicas (PII sensível de menor: nunca logar)
    bloodType: text('blood_type'),
    allergies: text('allergies'),
    medicalNotes: text('medical_notes'),
    // Contato de emergência
    emergencyName: text('emergency_name'),
    emergencyPhone: text('emergency_phone'),
    emergencyRelation: text('emergency_relation'),
    // Foto do aluno (public-assets bucket)
    photoUrl: text('photo_url'),
    // Documentos e dados civis (matrícula completa)
    cpf: text('cpf'),
    rg: text('rg'),
    gender: text('gender'), // sexo: 'F' | 'M' | 'outro' (texto livre, sem enum rígido)
    nationality: text('nationality'), // nacionalidade (default 'Brasileira' na UI)
    shift: text('shift'), // turno: manhã/tarde/noite/integral
    ...auditCols,
  },
  (t) => [
    index('students_tenant_idx').on(t.tenantId),
    index('students_class_idx').on(t.classId),
    pgPolicy('students_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// activities — banco de atividades do professor (Fase 1B.3). Conteúdo pedagógico
// reutilizável (plano/atividade/questão). `aiGenerated` sinaliza origem em IA
// (transparência, Master Spec §9.3). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const activities = oe.table(
  'activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    subject: text('subject'),
    // Tipo do material no banco: 'atividade' | 'prova' | 'trabalho' | 'roteiro'.
    kind: text('kind').notNull().default('atividade'),
    // Classificação para filtrar no banco: série/ano e faixa etária (faixa derivada da série).
    gradeLevel: text('grade_level'),
    ageBand: text('age_band'),
    // Data de aplicação (opcional) + evento de calendário vinculado (criado automaticamente).
    applyDate: date('apply_date'),
    eventId: uuid('event_id'),
    // Rascunho vs banco: conteúdo gerado pelo WayOn nasce `false` (rascunho); ao aprovar vira true.
    approved: boolean('approved').notNull().default(true),
    content: text('content').notNull().default(''),
    tags: text('tags').array().notNull().default([]),
    aiGenerated: boolean('ai_generated').notNull().default(false),
    ...auditCols,
  },
  (t) => [
    index('activities_tenant_idx').on(t.tenantId),
    pgPolicy('activities_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// materials — materiais didáticos por turma (e opcionalmente por matéria). O arquivo vive no
// bucket PRIVADO `tenant-files` (ADR 0005); aqui guardamos só os metadados + o storage_path.
// ---------------------------------------------------------------------------
export const materials = oe.table(
  'materials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    subject: text('subject'),
    title: text('title').notNull(),
    storagePath: text('storage_path').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    // Texto extraído do arquivo (PDF/txt) para o WayOn usar como contexto (RAG-lite).
    extractedText: text('extracted_text'),
    ...auditCols,
  },
  (t) => [
    index('materials_tenant_idx').on(t.tenantId),
    index('materials_class_idx').on(t.classId),
    pgPolicy('materials_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// ai_drafts — saídas de IA como RASCUNHO (Fase 1B.2, human-in-the-loop, Master Spec §9.3):
// o humano revisa e aprova antes de virar conteúdo oficial. Guarda consumo de tokens.
// Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const aiDrafts = oe.table(
  'ai_drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    kind: text('kind').notNull(), // 'lesson_plan' | 'activity' | ...
    // Aluno vinculado (opcional, ex.: correção de redação de um aluno específico).
    studentId: uuid('student_id'),
    prompt: text('prompt').notNull(),
    output: text('output').notNull().default(''),
    status: text('status').notNull().default('draft'), // draft | approved | discarded
    model: text('model'),
    tokensIn: integer('tokens_in').notNull().default(0),
    tokensOut: integer('tokens_out').notNull().default(0),
    ...auditCols,
  },
  (t) => [
    index('ai_drafts_tenant_idx').on(t.tenantId),
    pgPolicy('ai_drafts_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// units — unidades/campus (Fase 1A; SÓ organization, Master Spec §5). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const units = oe.table(
  'units',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    ...auditCols,
  },
  (t) => [
    index('units_tenant_idx').on(t.tenantId),
    pgPolicy('units_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// invitations — convites para membros da escola (Fase 1A.1). O aceite cria a membership.
// Tenant-scoped + RLS; `token` é o segredo do convite (lookup administrativo no aceite).
// ---------------------------------------------------------------------------
export const invitations = oe.table(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    email: text('email').notNull(),
    role: roleEnum('role').notNull(),
    token: text('token').notNull(),
    status: text('status').notNull().default('pending'), // pending | accepted | revoked
    ...auditCols,
  },
  (t) => [
    index('invitations_tenant_idx').on(t.tenantId),
    uniqueIndex('invitations_token_uq').on(t.token),
    pgPolicy('invitations_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: tenantPredicate,
      withCheck: tenantPredicate,
    }),
  ],
);

// ---------------------------------------------------------------------------
// Estrutura acadêmica (Fase 1A.1b, Master Spec §5). Tudo tenant-scoped + RLS.
// ---------------------------------------------------------------------------
const tenantPolicy = (name: string) =>
  pgPolicy(name, {
    as: 'permissive',
    for: 'all',
    to: 'public',
    using: tenantPredicate,
    withCheck: tenantPredicate,
  });

export const academicYears = oe.table(
  'academic_years',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(), // ex.: '2026'
    startsOn: date('starts_on'),
    endsOn: date('ends_on'),
    ...auditCols,
  },
  (t) => [
    index('academic_years_tenant_idx').on(t.tenantId),
    tenantPolicy('academic_years_tenant_isolation'),
  ],
);

export const terms = oe.table(
  'terms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    academicYearId: uuid('academic_year_id').notNull(),
    name: text('name').notNull(), // ex.: '1º bimestre'
    ...auditCols,
  },
  (t) => [index('terms_tenant_idx').on(t.tenantId), tenantPolicy('terms_tenant_isolation')],
);

export const subjects = oe.table(
  'subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    ...auditCols,
  },
  (t) => [index('subjects_tenant_idx').on(t.tenantId), tenantPolicy('subjects_tenant_isolation')],
);

// ---------------------------------------------------------------------------
// teaching_assignments — vínculo do professor (item 17): membership ↔ turma ↔ matéria.
// Cada professor leciona matérias específicas em turmas específicas. Base para que
// diário/notas/faltas reconheçam "quem leciona o quê". subject_id nulo = regente da turma
// (todas as matérias). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const teachingAssignments = oe.table(
  'teaching_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    membershipId: uuid('membership_id').notNull(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id'),
    ...auditCols,
  },
  (t) => [
    index('teaching_assignments_tenant_idx').on(t.tenantId),
    index('teaching_assignments_membership_idx').on(t.membershipId),
    uniqueIndex('teaching_assignments_uq').on(t.tenantId, t.membershipId, t.classId, t.subjectId),
    tenantPolicy('teaching_assignments_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// class_subjects — matérias da turma (item 3.2): vínculo N:N turma↔disciplina.
// Define a grade curricular da turma. Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const classSubjects = oe.table(
  'class_subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id').notNull(),
    ...auditCols,
  },
  (t) => [
    index('class_subjects_class_idx').on(t.classId),
    uniqueIndex('class_subjects_uq').on(t.tenantId, t.classId, t.subjectId),
    tenantPolicy('class_subjects_tenant_isolation'),
  ],
);

// guardians — responsáveis (PII: nunca logar em claro). Tenant-scoped + RLS.
export const guardians = oe.table(
  'guardians',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    // Dados civis do responsável (contratante do contrato de matrícula)
    cpf: text('cpf'),
    rg: text('rg'),
    address: text('address'),
    profession: text('profession'),
    portalPasswordHash: text('portal_password_hash'),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    ...auditCols,
  },
  (t) => [index('guardians_tenant_idx').on(t.tenantId), tenantPolicy('guardians_tenant_isolation')],
);

// student_guardians — N:N aluno↔responsável com atributos (Master Spec §5).
export const studentGuardians = oe.table(
  'student_guardians',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    guardianId: uuid('guardian_id').notNull(),
    relation: text('relation'), // mãe, pai, responsável legal...
    isFinancial: boolean('is_financial').notNull().default(false),
    canPickup: boolean('can_pickup').notNull().default(false),
    isEmergency: boolean('is_emergency').notNull().default(false),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('student_guardians_uq').on(t.tenantId, t.studentId, t.guardianId),
    tenantPolicy('student_guardians_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// Sala de aula (Fase 1A.2): diário (lessons), notas (grades), faltas (attendance).
// Tudo tenant-scoped + RLS. Reusam classes/students/subjects/terms já existentes.
// ---------------------------------------------------------------------------
export const lessons = oe.table(
  'lessons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id'),
    // vínculo opcional com o planejamento (item 7.2): este registro de diário cumpre um plano.
    lessonPlanId: uuid('lesson_plan_id'),
    date: date('date').notNull(),
    topic: text('topic').notNull(),
    notes: text('notes'),
    // Motor de aulas previstas (diário automático): 'dada' = registrada/realizada (default das
    // entradas manuais e das previstas que o professor não cancelou), 'prevista' = gerada pelo
    // cronograma e ainda não tocada, 'cancelada' = não houve aula (com motivo). Filosofia da UI:
    // prevista conta como dada; o professor só age para cancelar ou enriquecer com o tema.
    status: text('status').notNull().default('dada'),
    // Origem: o slot do cronograma que gerou esta aula (nulo = lançada manualmente no diário).
    slotId: uuid('slot_id'),
    cancelReason: text('cancel_reason'),
    // Unidade do plano de curso que esta aula cobre (preenchido ao distribuir a sequência didática).
    unitId: uuid('unit_id'),
    ...auditCols,
  },
  (t) => [
    index('lessons_tenant_idx').on(t.tenantId),
    index('lessons_class_date_idx').on(t.tenantId, t.classId, t.date),
    // Idempotência do motor: no máximo uma aula gerada por (slot, data). Parcial — só vale para
    // as geradas (slot_id não nulo); lançamentos manuais (slot_id nulo) ficam livres.
    uniqueIndex('lessons_slot_date_uq')
      .on(t.tenantId, t.slotId, t.date)
      .where(sql`${t.slotId} is not null`),
    tenantPolicy('lessons_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// lesson_plans — planejamento (itens 7.1/7.3): plano de aula, avaliação ou trabalho por
// turma/matéria. `kind` separa aula/avaliacao/trabalho. O diário (lessons) pode apontar
// para um plano. Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const lessonPlans = oe.table(
  'lesson_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id'),
    kind: text('kind').notNull().default('aula'), // aula | avaliacao | trabalho
    title: text('title').notNull(),
    content: text('content'),
    date: date('date'), // data prevista (opcional)
    ...auditCols,
  },
  (t) => [
    index('lesson_plans_tenant_idx').on(t.tenantId),
    index('lesson_plans_class_idx').on(t.classId),
    tenantPolicy('lesson_plans_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// curriculum_units — plano de curso / sequência didática (ponto 3 do módulo calendário):
// a ementa da matéria numa turma, como uma lista ORDENADA de unidades/temas, cada uma com
// quantas aulas deve ocupar. O distribuidor espalha essas unidades pelas aulas previstas
// (lessons) geradas pelo cronograma. Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const curriculumUnits = oe.table(
  'curriculum_units',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id'),
    position: integer('position').notNull().default(0), // ordem da unidade na sequência
    title: text('title').notNull(),
    content: text('content'), // objetivos/conteúdo da unidade (opcional)
    lessonsPlanned: integer('lessons_planned').notNull().default(1), // aulas que a unidade ocupa
    ...auditCols,
  },
  (t) => [
    index('curriculum_units_class_idx').on(t.tenantId, t.classId, t.subjectId, t.position),
    tenantPolicy('curriculum_units_tenant_isolation'),
  ],
);

export const grades = oe.table(
  'grades',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    classId: uuid('class_id'),
    subjectId: uuid('subject_id'),
    termId: uuid('term_id'),
    label: text('label').notNull(), // ex.: 'Prova 1'
    // kind (item 9): 'formal' (avaliação), 'participacao' (nota de participação),
    // 'anotacao' (observação qualitativa sem nota — value fica nulo).
    kind: text('kind').notNull().default('formal'),
    value: real('value'), // 0..escala; nulo para anotações
    note: text('note'), // texto da anotação/observação
    // componentId (item: pesos): a qual componente da média esta nota pertence
    // (ex.: Prova, Trabalho). Nulo = componente padrão (peso 1). A média final é
    // ponderada por componente (média dentro do componente × peso do componente).
    componentId: uuid('component_id'),
    ...auditCols,
  },
  (t) => [index('grades_tenant_idx').on(t.tenantId), tenantPolicy('grades_tenant_isolation')],
);

export const attendance = oe.table(
  'attendance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    classId: uuid('class_id').notNull(),
    // subjectId nulo = chamada por DIA (modelo antigo); preenchido = falta POR MATÉRIA (8.1).
    subjectId: uuid('subject_id'),
    date: date('date').notNull(),
    present: boolean('present').notNull().default(true),
    ...auditCols,
  },
  (t) => [
    index('attendance_tenant_idx').on(t.tenantId),
    // O índice físico usa NULLS NOT DISTINCT (ver migration) para que a chamada por dia
    // (subject_id NULL) continue sendo upsert idempotente, e a falta por matéria conviva.
    uniqueIndex('attendance_uq').on(t.tenantId, t.studentId, t.classId, t.date, t.subjectId),
    tenantPolicy('attendance_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// schedule_slots — cronograma/horário semanal da turma (item 7). Um slot = aula de uma
// matéria num dia da semana (weekday 1=segunda..7=domingo) com início/fim. Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const scheduleSlots = oe.table(
  'schedule_slots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id'),
    weekday: integer('weekday').notNull(), // 1=segunda ... 7=domingo
    startTime: text('start_time').notNull(), // 'HH:MM'
    endTime: text('end_time'),
    note: text('note'),
    ...auditCols,
  },
  (t) => [
    index('schedule_slots_class_idx').on(t.classId),
    tenantPolicy('schedule_slots_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// schedule_exceptions — alterações pontuais do cronograma (item 7): numa data específica
// a aula foi cancelada/alterada (ex.: feriado, prova, reposição). Não mexe na grade fixa.
// Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const scheduleExceptions = oe.table(
  'schedule_exceptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    date: date('date').notNull(),
    note: text('note').notNull(), // o que muda: "sem aula (feriado)", "prova de matemática"...
    ...auditCols,
  },
  (t) => [
    index('schedule_exceptions_class_idx').on(t.classId),
    tenantPolicy('schedule_exceptions_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// grade_components — composição da média definida pela ESCOLA (pesos das atividades).
// Ex.: Prova (peso 1), Trabalho (peso 2). A média final é ponderada por componente:
// média das notas dentro do componente × peso, somado e dividido pela soma dos pesos.
// Assim "quantos trabalhos" não desequilibra (faz a média dentro do componente).
// Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const gradeComponents = oe.table(
  'grade_components',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    weight: real('weight').notNull().default(1),
    position: integer('position').notNull().default(0),
    // Escopo: NULL = geral (todas as turmas); preenchido = componentes só daquela turma.
    classId: uuid('class_id'),
    ...auditCols,
  },
  (t) => [
    index('grade_components_tenant_idx').on(t.tenantId),
    tenantPolicy('grade_components_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// communications — comunicados (Comunicação). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const communications = oe.table(
  'communications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    status: text('status').notNull().default('draft'), // draft | published
    aiGenerated: boolean('ai_generated').notNull().default(false),
    // Segmentação por turma (NULL = geral para todos)
    classId: uuid('class_id'),
    ...auditCols,
  },
  (t) => [
    index('communications_tenant_idx').on(t.tenantId),
    tenantPolicy('communications_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// portfolio_entries — portfólio do aluno (Pedagógico). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const portfolioEntries = oe.table(
  'portfolio_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    // Anexo opcional (foto/arquivo da evidência) no bucket público.
    fileUrl: text('file_url'),
    ...auditCols,
  },
  (t) => [
    index('portfolio_entries_tenant_idx').on(t.tenantId),
    tenantPolicy('portfolio_entries_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// events — calendário/agenda. Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const events = oe.table(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    date: date('date').notNull(),
    time: text('time'),
    classId: uuid('class_id'),
    // Tipo (calendário escolar): 'evento' normal | 'feriado' | 'recesso' (não letivos).
    kind: text('kind').notNull().default('evento'),
    ...auditCols,
  },
  (t) => [index('events_tenant_idx').on(t.tenantId), tenantPolicy('events_tenant_isolation')],
);

// ---------------------------------------------------------------------------
// Feed social interno (rede social da escola): posts com foto, stories de 24h,
// curtidas e comentários. Tenant-scoped + RLS. Exibidos no app e no mural público.
// ---------------------------------------------------------------------------
export const feedPosts = oe.table(
  'feed_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    authorName: text('author_name'),
    body: text('body').notNull().default(''),
    imageUrl: text('image_url'),
    classId: uuid('class_id'),
    status: text('status').notNull().default('published'),
    ...auditCols,
  },
  (t) => [
    index('feed_posts_tenant_idx').on(t.tenantId),
    tenantPolicy('feed_posts_tenant_isolation'),
  ],
);

export const feedStories = oe.table(
  'feed_stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    imageUrl: text('image_url').notNull(),
    caption: text('caption'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...auditCols,
  },
  (t) => [
    index('feed_stories_tenant_idx').on(t.tenantId),
    tenantPolicy('feed_stories_tenant_isolation'),
  ],
);

export const feedPostReactions = oe.table(
  'feed_post_reactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    postId: uuid('post_id').notNull(),
    userId: uuid('user_id').notNull(),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('feed_post_reactions_uq').on(t.postId, t.userId),
    tenantPolicy('feed_post_reactions_tenant_isolation'),
  ],
);

export const feedPostComments = oe.table(
  'feed_post_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    postId: uuid('post_id').notNull(),
    authorName: text('author_name'),
    body: text('body').notNull(),
    ...auditCols,
  },
  (t) => [
    index('feed_post_comments_post_idx').on(t.postId),
    tenantPolicy('feed_post_comments_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// work_requests — Painel de trabalho (Kanban): solicitações que os professores
// abrem e a gestão (diretoria/coordenação) analisa. Tipos: ocorrência, serviço,
// impressão (atividade + cópias), comparecimento. Status: enviada → em_analise →
// resolvida (com conclusão). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const workRequests = oe.table(
  'work_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    type: text('type').notNull().default('servico'), // ocorrencia | servico | impressao | comparecimento
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    status: text('status').notNull().default('enviada'), // enviada | em_analise | resolvida
    studentId: uuid('student_id'),
    classId: uuid('class_id'),
    activityId: uuid('activity_id'), // impressão: atividade escolhida
    copies: integer('copies'), // impressão: nº de cópias
    requestedByName: text('requested_by_name'),
    resolution: text('resolution'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by'),
    ...auditCols,
  },
  (t) => [
    index('work_requests_tenant_idx').on(t.tenantId),
    tenantPolicy('work_requests_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// Simulados/Quizzes (Fase 1B.3). Um quiz tem N questões de múltipla escolha;
// cada tentativa de aluno guarda as respostas e a nota auto-corrigida.
// Tenant-scoped + RLS em todas as três tabelas.
// ---------------------------------------------------------------------------
export const quizzes = oe.table(
  'quizzes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    subject: text('subject'),
    ...auditCols,
  },
  (t) => [index('quizzes_tenant_idx').on(t.tenantId), tenantPolicy('quizzes_tenant_isolation')],
);

export const quizQuestions = oe.table(
  'quiz_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    quizId: uuid('quiz_id').notNull(),
    prompt: text('prompt').notNull(),
    options: text('options').array().notNull().default([]),
    correctIndex: integer('correct_index').notNull().default(0),
    position: integer('position').notNull().default(0),
    ...auditCols,
  },
  (t) => [
    index('quiz_questions_quiz_idx').on(t.quizId),
    tenantPolicy('quiz_questions_tenant_isolation'),
  ],
);

export const quizAttempts = oe.table(
  'quiz_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    quizId: uuid('quiz_id').notNull(),
    studentId: uuid('student_id'),
    studentName: text('student_name'),
    answers: jsonb('answers').notNull().default([]),
    score: real('score').notNull().default(0),
    total: integer('total').notNull().default(0),
    ...auditCols,
  },
  (t) => [
    index('quiz_attempts_quiz_idx').on(t.quizId),
    tenantPolicy('quiz_attempts_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// Mensagens internas (Fase 1A.3): registro de comunicação direta com um responsável,
// opcionalmente no contexto de um aluno. Conteúdo é PII; nunca logar. Tenant-scoped + RLS.
// (Resposta do responsável virá com o portal do responsável, no futuro.)
// ---------------------------------------------------------------------------
export const messages = oe.table(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    guardianId: uuid('guardian_id').notNull(),
    studentId: uuid('student_id'),
    subject: text('subject').notNull(),
    body: text('body').notNull().default(''),
    // Direção da mensagem no chat: 'school' (escola→responsável) | 'guardian' (responsável→escola).
    sender: text('sender').notNull().default('school'),
    // Quando a contraparte leu (badge de não lidas).
    readAt: timestamp('read_at', { withTimezone: true }),
    ...auditCols,
  },
  (t) => [
    index('messages_guardian_idx').on(t.guardianId),
    tenantPolicy('messages_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// Personalização da escola (Fase 1A): identidade visual e documentos. Uma linha por tenant.
// `theme_color` guarda um triplo HSL (ex.: "262 83% 58%") aplicado como --primary. RLS.
// ---------------------------------------------------------------------------
export const tenantSettings = oe.table(
  'tenant_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    logoUrl: text('logo_url'),
    themeColor: text('theme_color'),
    regimento: text('regimento'),
    docTemplates: text('doc_templates'),
    // Escala da nota (0..gradeScale); padrão 10. Definida pela escola.
    gradeScale: integer('grade_scale').notNull().default(10),
    // "Meu padrão" / padrão da escola (itens 18.3 / 11.5): estilo, cabeçalho/rodapé,
    // formato e nível de dificuldade aplicados a TODO conteúdo gerado pelo WayOn.
    aiStandard: text('ai_standard'),
    imageStyle: text('image_style'),
    // Nome do agente de IA escolhido pela escola/professor (padrão: WayOn).
    agentName: text('agent_name'),
    // Mural & feed: a escola escolhe o que fica ligado.
    feedStoriesEnabled: boolean('feed_stories_enabled').notNull().default(true),
    feedCommentsEnabled: boolean('feed_comments_enabled').notNull().default(true),
    // Chat interno: a escola permite (ou não) que o responsável envie mensagem ao professor.
    allowGuardianMessageTeacher: boolean('allow_guardian_message_teacher').notNull().default(false),
    // Pagamento online (preparado; ativa quando colar a chave do PSP). 'none' = desligado.
    paymentProvider: text('payment_provider').notNull().default('none'), // none | asaas | iugu | stripe
    paymentApiKeyEnc: text('payment_api_key_enc'),
    // Gamificação (Frente 8): liga/desliga por escola/professor + faixas de medalha.
    gamificationEnabled: boolean('gamification_enabled').notNull().default(true),
    medalBronze: integer('medal_bronze').notNull().default(50),
    medalPrata: integer('medal_prata').notNull().default(150),
    medalOuro: integer('medal_ouro').notNull().default(300),
    // Auto-pontos: pontos dados automaticamente a cada boa nota (>=60% da escala). 0 = desligado.
    autoPointsGrade: integer('auto_points_grade').notNull().default(0),
    // BYOK (Fase 2): provedor de IA do tenant ('default' = nosso Claude) + a API key DELE,
    // criptografada (AES-GCM). Quando configurado, usa a IA/tokens dele e pula a nossa cota.
    aiProvider: text('ai_provider').notNull().default('default'), // default | anthropic | openai | gemini
    aiApiKeyEnc: text('ai_api_key_enc'),
    // Perfil público: nome de exibição (sobrescreve tenants.name no sidebar), contato e endereço.
    profileName: text('profile_name'),
    profilePhone: text('profile_phone'),
    profileEmail: text('profile_email'),
    profileAddress: text('profile_address'),
    profileCnpj: text('profile_cnpj'),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('tenant_settings_tenant_uq').on(t.tenantId),
    tenantPolicy('tenant_settings_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// Ocorrências (Fase 1A): registro disciplinar/pedagógico, vinculável a 1 ou vários alunos.
// Conteúdo é dado sensível de menores: nunca logar. Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const occurrences = oe.table(
  'occurrences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    date: date('date').notNull(),
    severity: text('severity').notNull().default('leve'), // leve | media | grave
    ...auditCols,
  },
  (t) => [
    index('occurrences_tenant_idx').on(t.tenantId),
    tenantPolicy('occurrences_tenant_isolation'),
  ],
);

export const occurrenceStudents = oe.table(
  'occurrence_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    occurrenceId: uuid('occurrence_id').notNull(),
    studentId: uuid('student_id').notNull(),
    ...auditCols,
  },
  (t) => [
    index('occurrence_students_occ_idx').on(t.occurrenceId),
    index('occurrence_students_student_idx').on(t.studentId),
    tenantPolicy('occurrence_students_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// Financeiro 2.a (item 5.1): controle interno de cobranças/mensalidades por aluno,
// vinculadas ao responsável pagador. Valor em centavos (integer) para evitar float.
// "vencido" é derivado (aberto + due_date < hoje). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const invoices = oe.table(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id'),
    guardianId: uuid('guardian_id'),
    competencia: text('competencia').notNull(), // 'YYYY-MM'
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull().default(0),
    dueDate: date('due_date').notNull(),
    status: text('status').notNull().default('aberto'), // aberto | pago | cancelado
    paidAt: timestamp('paid_at', { withTimezone: true }),
    // Camada de pagamento online (AGNÓSTICA): tudo opcional/nullable. Sem provider
    // configurado, estes campos ficam null e o comportamento é o de hoje (2ª via
    // read-only, baixa manual). Preenchidos ao gerar uma cobrança no PSP escolhido.
    provider: text('provider'), // 'asaas' | 'iugu' | null
    externalChargeId: text('external_charge_id'), // id da cobrança no PSP
    paymentMethod: text('payment_method'), // 'pix' | 'boleto' | 'card' | null
    paymentUrl: text('payment_url'), // URL hospedada de checkout/2ª via
    pixCode: text('pix_code'), // Pix copia-e-cola
    boletoLine: text('boleto_line'), // linha digitável do boleto
    chargedAt: timestamp('charged_at', { withTimezone: true }), // quando a cobrança foi gerada
    ...auditCols,
  },
  (t) => [index('invoices_tenant_idx').on(t.tenantId), tenantPolicy('invoices_tenant_isolation')],
);

// ---------------------------------------------------------------------------
// finance_expenses — despesas da escola (para fluxo de caixa e DRE simples).
// Tenant-scoped + RLS. Receitas vêm de `invoices` (mensalidades pagas).
// ---------------------------------------------------------------------------
export const financeExpenses = oe.table(
  'finance_expenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull().default('outros'), // pessoal | aluguel | materiais | servicos | impostos | outros
    amountCents: integer('amount_cents').notNull().default(0),
    competencia: text('competencia').notNull(), // 'YYYY-MM'
    dueDate: date('due_date'),
    status: text('status').notNull().default('pago'), // pago | aberto
    paidAt: timestamp('paid_at', { withTimezone: true }),
    ...auditCols,
  },
  (t) => [
    index('finance_expenses_tenant_idx').on(t.tenantId),
    tenantPolicy('finance_expenses_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// Banco de atividades coletivas (item 13): biblioteca GLOBAL (sem tenant_id) por faixa
// etária. Conteúdo pedagógico não sensível, compartilhado entre todos. Leitura pública
// (policy `true`); acesso pela app é via conexão dona (bypassa RLS). Ver ADR 0004.
// ---------------------------------------------------------------------------
export const sharedActivities = oe.table(
  'shared_activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    subject: text('subject'),
    content: text('content').notNull().default(''),
    ageRange: text('age_range'), // EI | EF1 | EF2 | EM | outro
    tags: text('tags').array().notNull().default([]),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('shared_activities_age_idx').on(t.ageRange),
    pgPolicy('shared_activities_public', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

// ---------------------------------------------------------------------------
// whatsapp_connections — conexão WhatsApp (Evolution API) por tenant (ADR 0006).
// Uma linha por tenant; instância nomeada `edu_<tenant_id>` no servidor Evolution único.
// ---------------------------------------------------------------------------
export const whatsappConnections = oe.table(
  'whatsapp_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    provider: text('provider').notNull().default('evolution'),
    instanceId: text('instance_id').notNull(),
    webhookSecret: text('webhook_secret'),
    phone: text('phone'),
    active: boolean('active').notNull().default(false),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('whatsapp_connections_tenant_uq').on(t.tenantId),
    tenantPolicy('whatsapp_connections_tenant_isolation'),
  ],
);

// whatsapp_conversations / whatsapp_messages — inbox do WhatsApp (Fase 3). Uma conversa por
// número; mensagens com direção in/out. RLS por tenant.
export const whatsappConversations = oe.table(
  'whatsapp_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    phone: text('phone').notNull(),
    contactName: text('contact_name'),
    lastMessage: text('last_message'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    unread: integer('unread').notNull().default(0),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('whatsapp_conversations_tenant_phone_uq').on(t.tenantId, t.phone),
    tenantPolicy('whatsapp_conversations_tenant_isolation'),
  ],
);

export const whatsappMessages = oe.table(
  'whatsapp_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    conversationId: uuid('conversation_id').notNull(),
    direction: text('direction').notNull(),
    body: text('body').notNull(),
    waMessageId: text('wa_message_id'),
    ...auditCols,
  },
  (t) => [
    index('whatsapp_messages_conv_idx').on(t.conversationId),
    tenantPolicy('whatsapp_messages_tenant_isolation'),
  ],
);

// ai_standard_samples — modelos de referência do tenant ("Meu padrão"): provas/atividades
// que o professor sobe para o WayOn imitar o formato/estilo. Arquivo no bucket privado; aqui
// metadados + texto extraído (entra como referência nas gerações via getAiStandard).
export const aiStandardSamples = oe.table(
  'ai_standard_samples',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    // Categoria do modelo: 'prova' | 'atividade' | 'outro' (para o WayOn aplicar o certo).
    kind: text('kind').notNull().default('outro'),
    title: text('title').notNull(),
    fileName: text('file_name').notNull(),
    storagePath: text('storage_path').notNull(),
    extractedText: text('extracted_text'),
    ...auditCols,
  },
  (t) => [
    index('ai_standard_samples_tenant_idx').on(t.tenantId),
    tenantPolicy('ai_standard_samples_tenant_isolation'),
  ],
);

// flashcard_decks — baralhos de flashcards (frente/verso) gerados pelo WayOn ou manuais.
// Cards guardados em jsonb (simples; o estudo é só leitura/flip).
export const flashcardDecks = oe.table(
  'flashcard_decks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    subject: text('subject'),
    gradeLevel: text('grade_level'),
    ageBand: text('age_band'),
    cards: jsonb('cards')
      .$type<{ front: string; back: string; image?: string }[]>()
      .notNull()
      .default([]),
    aiGenerated: boolean('ai_generated').notNull().default(false),
    ...auditCols,
  },
  (t) => [
    index('flashcard_decks_tenant_idx').on(t.tenantId),
    tenantPolicy('flashcard_decks_tenant_isolation'),
  ],
);

// generated_images — imagens geradas pelo WayOn (OpenAI gpt-image-1), por tenant.
export const generatedImages = oe.table(
  'generated_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    prompt: text('prompt').notNull(),
    url: text('url').notNull(),
    quality: text('quality'),
    ...auditCols,
  },
  (t) => [
    index('generated_images_tenant_idx').on(t.tenantId),
    tenantPolicy('generated_images_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// student_points — gamificação (Frente 4b): ledger de pontos por aluno. Cada linha é uma
// premiação (positiva) com motivo. O total e a medalha são derivados da soma. Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const studentPoints = oe.table(
  'student_points',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    points: integer('points').notNull().default(0),
    reason: text('reason'),
    ...auditCols,
  },
  (t) => [
    index('student_points_tenant_idx').on(t.tenantId),
    index('student_points_student_idx').on(t.studentId),
    tenantPolicy('student_points_tenant_isolation'),
  ],
);

// api_keys — chaves de API por tenant (API aberta). Guarda só o HASH (sha256); o valor é
// mostrado uma vez na criação. `token_prefix` é os 1os caracteres, só para exibir na lista.
export const apiKeys = oe.table(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    tokenPrefix: text('token_prefix').notNull(),
    tokenHash: text('token_hash').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ...auditCols,
  },
  (t) => [
    index('api_keys_tenant_idx').on(t.tenantId),
    uniqueIndex('api_keys_hash_uq').on(t.tokenHash),
    tenantPolicy('api_keys_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// guardian_access_tokens — links de acesso do portal do responsável (sem login Supabase).
// Gerado pela escola; o responsável acessa /portal/<token>. Tenant-scoped + RLS.
// O token bruto nunca é armazenado; só o hash SHA-256.
// ---------------------------------------------------------------------------
export const guardianAccessTokens = oe.table(
  'guardian_access_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    guardianId: uuid('guardian_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('guardian_access_tokens_hash_uq').on(t.tokenHash),
    index('guardian_access_tokens_guardian_idx').on(t.tenantId, t.guardianId),
    tenantPolicy('guardian_access_tokens_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// networks — grupo de escolas (rede/franquia). Não tenant-scoped: é uma entidade global
// que agrega múltiplos tenants. Vínculo: tenants.network_id → networks.id.
// ---------------------------------------------------------------------------
export const networks = oe.table('networks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerUserId: uuid('owner_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// class_councils — Conselho de classe por turma. Cada conselho agrega pareceres
// por aluno (council_remarks). Status: draft → closed.
// ---------------------------------------------------------------------------
export const classCouncils = oe.table(
  'class_councils',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    title: text('title').notNull(),
    date: date('date').notNull(),
    status: text('status').notNull().default('draft'), // draft | closed
    ...auditCols,
  },
  (t) => [
    index('class_councils_tenant_idx').on(t.tenantId),
    index('class_councils_class_idx').on(t.classId),
    tenantPolicy('class_councils_tenant_isolation'),
  ],
);

// council_remarks — Parecer individual de um aluno dentro de um conselho de classe.
export const councilRemarks = oe.table(
  'council_remarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    councilId: uuid('council_id').notNull(),
    studentId: uuid('student_id').notNull(),
    remark: text('remark'),
    recommendation: text('recommendation'), // aprovado | reforço | reprovado | transferido
    ...auditCols,
  },
  (t) => [
    index('council_remarks_tenant_idx').on(t.tenantId),
    index('council_remarks_council_idx').on(t.councilId),
    tenantPolicy('council_remarks_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// infant_diary_entries — Diário infantil: registros diários por aluno (EI/1º anos).
// Categorias: observation | milestone | health | photo.
// ---------------------------------------------------------------------------
export const infantDiaryEntries = oe.table(
  'infant_diary_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    date: date('date').notNull(),
    category: text('category').notNull().default('observation'),
    content: text('content'),
    photoUrl: text('photo_url'),
    ...auditCols,
  },
  (t) => [
    index('infant_diary_entries_tenant_idx').on(t.tenantId),
    index('infant_diary_entries_student_idx').on(t.studentId),
    tenantPolicy('infant_diary_entries_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// exit_authorizations — Autorização de saída antecipada do aluno.
// Status: pending → approved | denied → executed.
// ---------------------------------------------------------------------------
export const exitAuthorizations = oe.table(
  'exit_authorizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    date: date('date').notNull(),
    time: text('time'), // hora prevista 'HH:MM'
    reason: text('reason').notNull(),
    authorizedByName: text('authorized_by_name'),
    status: text('status').notNull().default('pending'),
    notes: text('notes'),
    ...auditCols,
  },
  (t) => [
    index('exit_authorizations_tenant_idx').on(t.tenantId),
    index('exit_authorizations_student_idx').on(t.studentId),
    tenantPolicy('exit_authorizations_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// equipment + equipment_loans — Inventário de equipamentos escolares.
// equipment: cadastro. equipment_loans: empréstimo por professor/funcionário.
// ---------------------------------------------------------------------------
export const equipment = oe.table(
  'equipment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    category: text('category'), // tablet | projetor | notebook | livro | outro
    serialNumber: text('serial_number'),
    status: text('status').notNull().default('available'), // available | loaned | maintenance
    description: text('description'),
    purchaseDate: date('purchase_date'),
    ...auditCols,
  },
  (t) => [
    index('equipment_tenant_idx').on(t.tenantId),
    tenantPolicy('equipment_tenant_isolation'),
  ],
);

export const equipmentLoans = oe.table(
  'equipment_loans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    equipmentId: uuid('equipment_id').notNull(),
    loanedTo: text('loaned_to').notNull(),
    loanedAt: timestamp('loaned_at', { withTimezone: true }).defaultNow().notNull(),
    expectedReturn: date('expected_return'),
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    notes: text('notes'),
    ...auditCols,
  },
  (t) => [
    index('equipment_loans_tenant_idx').on(t.tenantId),
    index('equipment_loans_equipment_idx').on(t.equipmentId),
    tenantPolicy('equipment_loans_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// absence_justifications — Justificativas de falta enviadas pelo responsável.
// Escola analisa (reviewed_by/reviewed_at) e aprova ou nega.
// ---------------------------------------------------------------------------
export const absenceJustifications = oe.table(
  'absence_justifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    date: date('date').notNull(),
    reason: text('reason').notNull(),
    documentUrl: text('document_url'),
    submittedByName: text('submitted_by_name'),
    status: text('status').notNull().default('pending'), // pending | approved | denied
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    ...auditCols,
  },
  (t) => [
    index('absence_justifications_tenant_idx').on(t.tenantId),
    index('absence_justifications_student_idx').on(t.studentId),
    tenantPolicy('absence_justifications_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// meeting_slots + meeting_bookings — Agendamento de reunião escola-responsável.
// Professor/coordenador cria slots; responsável agenda via portal (ou secretaria).
// ---------------------------------------------------------------------------
export const meetingSlots = oe.table(
  'meeting_slots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    hostId: uuid('host_id').notNull(), // membership_id do professor/coordenador
    date: date('date').notNull(),
    startTime: text('start_time').notNull(), // 'HH:MM'
    durationMinutes: integer('duration_minutes').notNull().default(30),
    title: text('title').notNull().default('Reunião com responsável'),
    available: boolean('available').notNull().default(true),
    ...auditCols,
  },
  (t) => [
    index('meeting_slots_tenant_idx').on(t.tenantId),
    index('meeting_slots_date_idx').on(t.tenantId, t.date),
    tenantPolicy('meeting_slots_tenant_isolation'),
  ],
);

export const meetingBookings = oe.table(
  'meeting_bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    slotId: uuid('slot_id').notNull(),
    studentId: uuid('student_id'),
    guardianName: text('guardian_name').notNull(),
    guardianPhone: text('guardian_phone'),
    notes: text('notes'),
    confirmed: boolean('confirmed').notNull().default(false),
    ...auditCols,
  },
  (t) => [
    index('meeting_bookings_tenant_idx').on(t.tenantId),
    index('meeting_bookings_slot_idx').on(t.slotId),
    tenantPolicy('meeting_bookings_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// webhook_endpoints — Endpoints de integração (Webhooks). A escola configura URLs
// que recebem eventos (student.created, grade.posted, attendance.recorded…).
// O campo `secret` guarda o HMAC secret para assinar o payload.
// ---------------------------------------------------------------------------
export const webhookEndpoints = oe.table(
  'webhook_endpoints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    url: text('url').notNull(),
    secret: text('secret'),
    events: text('events').array().notNull().default([]),
    active: boolean('active').notNull().default(true),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    ...auditCols,
  },
  (t) => [
    index('webhook_endpoints_tenant_idx').on(t.tenantId),
    tenantPolicy('webhook_endpoints_tenant_isolation'),
  ],
);

// school_calendar_events — feriados, datas comemorativas, dias não letivos.
export const schoolCalendarEvents = oe.table(
  'school_calendar_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    date: date('date').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull().default('holiday'),
    recurring: boolean('recurring').notNull().default(false),
    ...auditCols,
  },
  (t) => [
    index('calendar_events_tenant_idx').on(t.tenantId),
    tenantPolicy('calendar_events_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// communication_reads — confirmação de leitura de comunicado pelo responsável.
// Um registro por (comunicado, responsável) que abriu no portal. Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const communicationReads = oe.table(
  'communication_reads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    communicationId: uuid('communication_id').notNull(),
    guardianId: uuid('guardian_id').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).defaultNow().notNull(),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('communication_reads_uq').on(t.tenantId, t.communicationId, t.guardianId),
    index('communication_reads_comm_idx').on(t.communicationId),
    tenantPolicy('communication_reads_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// enrollment_requests — solicitações de matrícula vindas do formulário PÚBLICO.
// Ficam como 'pending' até a secretaria aprovar (vira aluno+responsável) ou rejeitar.
// Tenant-scoped + RLS; inserção pública via service role (sem sessão).
// ---------------------------------------------------------------------------
export const enrollmentRequests = oe.table(
  'enrollment_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    // Dados do aluno
    studentName: text('student_name').notNull(),
    birthDate: date('birth_date'),
    shift: text('shift'),
    // Dados do responsável
    guardianName: text('guardian_name').notNull(),
    guardianEmail: text('guardian_email'),
    guardianPhone: text('guardian_phone'),
    guardianCpf: text('guardian_cpf'),
    relation: text('relation'),
    notes: text('notes'),
    // pending | approved | rejected
    status: text('status').notNull().default('pending'),
    ...auditCols,
  },
  (t) => [
    index('enrollment_requests_tenant_idx').on(t.tenantId),
    tenantPolicy('enrollment_requests_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// Biblioteca: acervo (library_items) + empréstimos (library_loans). Portaria: registro
// de entrada/saída (gate_logs). Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const libraryItems = oe.table(
  'library_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    author: text('author'),
    code: text('code'), // tombo / ISBN
    status: text('status').notNull().default('disponivel'), // disponivel | emprestado
    ...auditCols,
  },
  (t) => [
    index('library_items_tenant_idx').on(t.tenantId),
    tenantPolicy('library_items_tenant_isolation'),
  ],
);

export const libraryLoans = oe.table(
  'library_loans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    itemId: uuid('item_id').notNull(),
    borrowerName: text('borrower_name').notNull(),
    studentId: uuid('student_id'),
    loanedAt: timestamp('loaned_at', { withTimezone: true }).defaultNow().notNull(),
    dueDate: date('due_date'),
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    ...auditCols,
  },
  (t) => [
    index('library_loans_tenant_idx').on(t.tenantId),
    tenantPolicy('library_loans_tenant_isolation'),
  ],
);

export const gateLogs = oe.table(
  'gate_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    personName: text('person_name').notNull(),
    kind: text('kind').notNull().default('visitante'), // aluno | funcionario | visitante
    direction: text('direction').notNull().default('entrada'), // entrada | saida
    studentId: uuid('student_id'),
    note: text('note'),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
    ...auditCols,
  },
  (t) => [index('gate_logs_tenant_idx').on(t.tenantId), tenantPolicy('gate_logs_tenant_isolation')],
);

// ---------------------------------------------------------------------------
// leads — CRM de captação (funil de matrícula): novo → contato → visita → matriculado/perdido.
// Tenant-scoped + RLS.
// ---------------------------------------------------------------------------
export const leads = oe.table(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(), // nome do aluno/interessado
    guardianName: text('guardian_name'),
    contact: text('contact'), // telefone/e-mail
    source: text('source').notNull().default('outro'), // site | indicacao | redes | passagem | outro
    interestGrade: text('interest_grade'), // série de interesse
    stage: text('stage').notNull().default('novo'), // novo | contato | visita | matriculado | perdido
    notes: text('notes'),
    ...auditCols,
  },
  (t) => [index('leads_tenant_idx').on(t.tenantId), tenantPolicy('leads_tenant_isolation')],
);

// ---------------------------------------------------------------------------
// portal_messages — chat interno entre o responsável (portal) e a escola (coordenação/
// professor). `fromGuardian` diz a direção; `target` é o destino escolhido pelo pai. RLS.
// ---------------------------------------------------------------------------
export const portalMessages = oe.table(
  'portal_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    guardianId: uuid('guardian_id').notNull(),
    body: text('body').notNull(),
    fromGuardian: boolean('from_guardian').notNull().default(true),
    authorName: text('author_name'),
    target: text('target').notNull().default('coordenacao'), // coordenacao | professor
    readAt: timestamp('read_at', { withTimezone: true }),
    ...auditCols,
  },
  (t) => [
    index('portal_messages_guardian_idx').on(t.guardianId),
    tenantPolicy('portal_messages_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// contract_signatures — assinatura eletrônica do contrato de matrícula (click-to-sign).
// Guarda quem assinou, quando e um resumo dos termos no momento da assinatura. RLS.
// ---------------------------------------------------------------------------
export const contractSignatures = oe.table(
  'contract_signatures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    signerName: text('signer_name').notNull(),
    signerKind: text('signer_kind').notNull().default('responsavel'), // responsavel | escola
    termsSnapshot: text('terms_snapshot'),
    signedAt: timestamp('signed_at', { withTimezone: true }).defaultNow().notNull(),
    ...auditCols,
  },
  (t) => [
    index('contract_signatures_student_idx').on(t.studentId),
    tenantPolicy('contract_signatures_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// custom_field_defs — campos personalizados por tenant numa entidade (ex.: 'student').
// Definidos pelo admin (setup); o app renderiza e captura os valores. RLS.
// ---------------------------------------------------------------------------
export const customFieldDefs = oe.table(
  'custom_field_defs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    entity: text('entity').notNull(),
    fieldKey: text('field_key').notNull(),
    label: text('label').notNull(),
    // text | textarea | number | date | select | checkbox | phone | email
    fieldType: text('field_type').notNull().default('text'),
    options: jsonb('options').$type<string[]>(),
    required: boolean('required').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...auditCols,
  },
  (t) => [
    index('custom_field_defs_tenant_entity_idx').on(t.tenantId, t.entity),
    tenantPolicy('custom_field_defs_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// custom_field_values — valores dos campos personalizados por registro. RLS.
// ---------------------------------------------------------------------------
export const customFieldValues = oe.table(
  'custom_field_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    fieldId: uuid('field_id').notNull(),
    recordId: uuid('record_id').notNull(),
    value: text('value'),
    ...auditCols,
  },
  (t) => [
    index('custom_field_values_record_idx').on(t.tenantId, t.recordId),
    uniqueIndex('custom_field_values_field_record_uq').on(t.fieldId, t.recordId),
    tenantPolicy('custom_field_values_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// push_subscriptions — inscrições de notificação push (web push) por usuário/aparelho. RLS.
// ---------------------------------------------------------------------------
export const pushSubscriptions = oe.table(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('push_subscriptions_endpoint_uq').on(t.endpoint),
    index('push_subscriptions_user_idx').on(t.tenantId, t.userId),
    tenantPolicy('push_subscriptions_tenant_isolation'),
  ],
);

// ---------------------------------------------------------------------------
// content_ratings — nota (1-5) do usuário no conteúdo gerado pela IA. Alimenta o "treino"
// por contexto: exemplares por usuário (mente direcional) e globais (mente central). RLS.
// ---------------------------------------------------------------------------
export const contentRatings = oe.table(
  'content_ratings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    // atividade | prova | trabalho | roteiro | plano | flashcards | imagem
    kind: text('kind').notNull(),
    contentId: uuid('content_id'),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    subject: text('subject'),
    gradeLevel: text('grade_level'),
    ageBand: text('age_band'),
    // Texto do conteúdo avaliado (anonimizado) — usado como exemplar nas próximas gerações.
    snapshot: text('snapshot'),
    ...auditCols,
  },
  (t) => [
    uniqueIndex('content_ratings_user_content_uq').on(t.userId, t.kind, t.contentId),
    index('content_ratings_user_kind_idx').on(t.tenantId, t.userId, t.kind),
    index('content_ratings_kind_rating_idx').on(t.kind, t.rating),
    tenantPolicy('content_ratings_tenant_isolation'),
  ],
);

export const schema = {
  tenants,
  users,
  memberships,
  plans,
  subscriptions,
  entitlements,
  usageMeters,
  auditLog,
  classes,
  students,
  activities,
  materials,
  aiDrafts,
  units,
  invitations,
  academicYears,
  terms,
  subjects,
  teachingAssignments,
  classSubjects,
  guardians,
  studentGuardians,
  lessons,
  lessonPlans,
  grades,
  gradeComponents,
  attendance,
  scheduleSlots,
  scheduleExceptions,
  communications,
  portfolioEntries,
  events,
  quizzes,
  quizQuestions,
  quizAttempts,
  messages,
  tenantSettings,
  occurrences,
  occurrenceStudents,
  invoices,
  sharedActivities,
  whatsappConnections,
  whatsappConversations,
  whatsappMessages,
  apiKeys,
  aiStandardSamples,
  flashcardDecks,
  generatedImages,
  studentPoints,
  guardianAccessTokens,
  curriculumUnits,
  // Onda 1–3 (2026-06-15)
  networks,
  classCouncils,
  councilRemarks,
  infantDiaryEntries,
  exitAuthorizations,
  equipment,
  equipmentLoans,
  absenceJustifications,
  meetingSlots,
  meetingBookings,
  webhookEndpoints,
  schoolCalendarEvents,
  communicationReads,
  enrollmentRequests,
  customFieldDefs,
  customFieldValues,
  pushSubscriptions,
  contentRatings,
};
