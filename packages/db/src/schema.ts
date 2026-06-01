import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

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
export const tenantTypeEnum = pgEnum('tenant_type', ['organization', 'individual']);
export const roleEnum = pgEnum('role', [
  'owner',
  'director',
  'coordinator',
  'teacher',
  'staff_secretary',
  'staff_finance',
  'guardian',
  'student',
]);

/** Predicado RLS reutilizável: a linha pertence ao tenant da sessão. */
const tenantPredicate = sql`tenant_id = current_setting('app.tenant_id', true)::uuid`;

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
export const tenants = pgTable(
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
      using: sql`id = current_setting('app.tenant_id', true)::uuid`,
      withCheck: sql`id = current_setting('app.tenant_id', true)::uuid`,
    }),
  ],
);

// ---------------------------------------------------------------------------
// users — identidade global (um usuário pode ter membership em vários tenants).
// Não é tenant-scoped; o vínculo tenant↔user é a `memberships`.
// ---------------------------------------------------------------------------
export const users = pgTable(
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
export const memberships = pgTable(
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
export const plans = pgTable('plans', {
  id: text('id').primaryKey(), // slug estável: 'teacher_free', 'school_full', ...
  name: text('name').notNull(),
  tenantType: tenantTypeEnum('tenant_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// subscriptions — assinatura do SaaS por tenant (quem paga pelo produto). RLS.
// ---------------------------------------------------------------------------
export const subscriptions = pgTable(
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
export const entitlements = pgTable(
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
export const usageMeters = pgTable(
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
export const auditLog = pgTable(
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
export const classes = pgTable(
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
export const students = pgTable(
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
export const activities = pgTable(
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
export const aiDrafts = pgTable(
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
export const units = pgTable(
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
export const invitations = pgTable(
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

export const academicYears = pgTable(
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

export const terms = pgTable(
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

export const subjects = pgTable(
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
export const guardians = pgTable(
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
export const studentGuardians = pgTable(
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
};
