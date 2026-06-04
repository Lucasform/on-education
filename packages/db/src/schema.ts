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
    status: text('status').notNull().default('active'),
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
    ...auditCols,
  },
  (t) => [index('lessons_tenant_idx').on(t.tenantId), tenantPolicy('lessons_tenant_isolation')],
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
    ...auditCols,
  },
  (t) => [index('events_tenant_idx').on(t.tenantId), tenantPolicy('events_tenant_isolation')],
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
    // formato e nível de dificuldade aplicados a TODO conteúdo gerado pelo EduON.
    aiStandard: text('ai_standard'),
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
    ...auditCols,
  },
  (t) => [index('invoices_tenant_idx').on(t.tenantId), tenantPolicy('invoices_tenant_isolation')],
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
};
