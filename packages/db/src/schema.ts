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
    date: date('date').notNull(),
    topic: text('topic').notNull(),
    notes: text('notes'),
    ...auditCols,
  },
  (t) => [index('lessons_tenant_idx').on(t.tenantId), tenantPolicy('lessons_tenant_isolation')],
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
    value: real('value').notNull(), // 0..10 (ou outra escala)
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
    date: date('date').notNull(),
    present: boolean('present').notNull().default(true),
    ...auditCols,
  },
  (t) => [
    index('attendance_tenant_idx').on(t.tenantId),
    uniqueIndex('attendance_uq').on(t.tenantId, t.studentId, t.classId, t.date),
    tenantPolicy('attendance_tenant_isolation'),
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
  guardians,
  studentGuardians,
  lessons,
  grades,
  attendance,
  communications,
  portfolioEntries,
  events,
};
