import {
  activities,
  classes,
  type DbClient,
  memberships,
  students,
  tenants,
  users,
} from '@on-education/db';
import type { TenantType } from '@on-education/core';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';

/**
 * Visão de ADMIN do app (super-admin do SaaS, à la `admin_onway`). Lê dados de TODOS os
 * tenants, então roda na conexão admin (`client.db`, cross-tenant). NUNCA expor a tenants
 * comuns — é só para o operador do produto.
 */
export interface TenantOverview {
  id: string;
  name: string;
  tenantType: TenantType;
  createdAt: Date;
  deletedAt: Date | null;
  isClient: boolean;
  members: number;
  students: number;
}

export interface AppStats {
  tenants: number;
  organizations: number;
  individuals: number;
  users: number;
  students: number;
  classes: number;
  activities: number;
}

export async function listAllTenants(
  client: DbClient,
  opts: { includeDeleted?: boolean } = {},
): Promise<TenantOverview[]> {
  // UMA consulta só (subqueries por linha) — antes eram 3 round-trips que, no pool max:1,
  // enfileiravam e travavam o painel admin. As contagens viram subselects correlacionados.
  const where = opts.includeDeleted ? sql`` : sql`where ${tenants.deletedAt} is null`;
  const rows = (await client.db.execute(sql`
    select
      ${tenants.id} as id,
      ${tenants.name} as name,
      ${tenants.tenantType} as tenant_type,
      ${tenants.createdAt} as created_at,
      ${tenants.deletedAt} as deleted_at,
      ${tenants.isClient} as is_client,
      (select count(distinct ${memberships.userId}) from ${memberships}
        where ${memberships.tenantId} = ${tenants.id}) as members,
      (select count(*) from ${students}
        where ${students.tenantId} = ${tenants.id}) as students
    from ${tenants}
    ${where}
    order by ${tenants.createdAt} desc
  `)) as unknown as Array<{
    id: string;
    name: string;
    tenant_type: TenantType;
    created_at: Date;
    deleted_at: Date | null;
    is_client: boolean;
    members: number | string;
    students: number | string;
  }>;

  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    tenantType: t.tenant_type,
    createdAt: new Date(t.created_at),
    deletedAt: t.deleted_at ? new Date(t.deleted_at) : null,
    isClient: Boolean(t.is_client),
    members: Number(t.members ?? 0),
    students: Number(t.students ?? 0),
  }));
}

export async function getAppStats(client: DbClient): Promise<AppStats> {
  // Tudo numa ÚNICA consulta (subqueries) — antes eram 6 round-trips que, no pool max:1,
  // enfileiravam e deixavam o painel lento. Agora é 1 ida ao banco.
  const rows = (await client.db.execute(sql`
    select
      (select count(*) from ${tenants} where ${tenants.deletedAt} is null) as tenants,
      (select count(*) from ${tenants}
        where ${tenants.deletedAt} is null and ${tenants.tenantType} = 'organization') as organizations,
      (select count(*) from ${tenants}
        where ${tenants.deletedAt} is null and ${tenants.tenantType} = 'individual') as individuals,
      (select count(distinct ${memberships.userId}) from ${memberships}) as users,
      (select count(*) from ${students}) as students,
      (select count(*) from ${classes}) as classes,
      (select count(*) from ${activities}) as activities
  `)) as unknown as Array<Record<keyof AppStats, number | string>>;
  const r = rows[0];
  const n = (v: number | string | undefined) => Number(v ?? 0);
  return {
    tenants: n(r?.tenants),
    organizations: n(r?.organizations),
    individuals: n(r?.individuals),
    users: n(r?.users),
    students: n(r?.students),
    classes: n(r?.classes),
    activities: n(r?.activities),
  };
}

export interface TenantDetail extends TenantOverview {
  classes: number;
  activities: number;
  roles: { role: string; count: number }[];
}

/** Detalhe de um único tenant (escola/professor) para a tela de detalhe do admin. */
export async function getTenantDetail(
  client: DbClient,
  tenantId: string,
): Promise<TenantDetail | null> {
  // Tenant + todas as contagens numa consulta (subselects); papéis (group by) na segunda.
  // Antes eram 6 round-trips que travavam no pool max:1.
  const [tRows, rolesRows] = await Promise.all([
    client.db.execute(sql`
      select
        ${tenants.id} as id,
        ${tenants.name} as name,
        ${tenants.tenantType} as tenant_type,
        ${tenants.createdAt} as created_at,
        ${tenants.deletedAt} as deleted_at,
        ${tenants.isClient} as is_client,
        (select count(distinct ${memberships.userId}) from ${memberships}
          where ${memberships.tenantId} = ${tenants.id}) as members,
        (select count(*) from ${students} where ${students.tenantId} = ${tenants.id}) as students,
        (select count(*) from ${classes} where ${classes.tenantId} = ${tenants.id}) as classes,
        (select count(*) from ${activities}
          where ${activities.tenantId} = ${tenants.id}) as activities
      from ${tenants}
      where ${tenants.id} = ${tenantId}
    `) as unknown as Array<{
      id: string;
      name: string;
      tenant_type: TenantType;
      created_at: Date;
      deleted_at: Date | null;
      is_client: boolean;
      members: number | string;
      students: number | string;
      classes: number | string;
      activities: number | string;
    }>,
    client.db
      .select({ role: memberships.role, c: count() })
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId))
      .groupBy(memberships.role),
  ]);

  const t = tRows[0];
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    tenantType: t.tenant_type,
    createdAt: new Date(t.created_at),
    deletedAt: t.deleted_at ? new Date(t.deleted_at) : null,
    isClient: Boolean(t.is_client),
    members: Number(t.members ?? 0),
    students: Number(t.students ?? 0),
    classes: Number(t.classes ?? 0),
    activities: Number(t.activities ?? 0),
    roles: rolesRows.map((r) => ({ role: String(r.role), count: Number(r.c) })),
  };
}

/** Marca/desmarca o tenant como cliente pagante (CRM do super-admin). */
export async function setTenantClient(client: DbClient, tenantId: string, isClient: boolean) {
  await client.db.update(tenants).set({ isClient }).where(eq(tenants.id, tenantId));
}

// --- Drill-down do admin: listas reais de um tenant (cross-tenant, super-admin) ----------

export interface AdminMember {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
}

/** Membros (equipe) de um tenant: nome, e-mail e papel. */
export async function listTenantMembers(
  client: DbClient,
  tenantId: string,
): Promise<AdminMember[]> {
  const rows = await client.db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      name: users.fullName,
      email: users.email,
    })
    .from(memberships)
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.tenantId, tenantId));
  return rows.map((r) => ({
    userId: r.userId,
    name: r.name ?? null,
    email: r.email ?? null,
    role: String(r.role),
  }));
}

export interface AdminClass {
  id: string;
  name: string;
  gradeLevel: string | null;
  students: number;
}

/** Turmas de um tenant com a contagem de alunos de cada uma. */
export async function listTenantClasses(
  client: DbClient,
  tenantId: string,
): Promise<AdminClass[]> {
  const rows = (await client.db.execute(sql`
    select
      ${classes.id} as id,
      ${classes.name} as name,
      ${classes.gradeLevel} as grade_level,
      (select count(*) from ${students}
        where ${students.classId} = ${classes.id} and ${students.deletedAt} is null) as students
    from ${classes}
    where ${classes.tenantId} = ${tenantId} and ${classes.deletedAt} is null
    order by ${classes.name}
  `)) as unknown as Array<{
    id: string;
    name: string;
    grade_level: string | null;
    students: number | string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    gradeLevel: r.grade_level ?? null,
    students: Number(r.students ?? 0),
  }));
}

export interface AdminActivity {
  id: string;
  title: string;
  kind: string;
  subject: string | null;
  approved: boolean;
  createdAt: Date;
}

/** Atividades de um tenant (lista). O conteúdo completo vem em getTenantActivity. */
export async function listTenantActivities(
  client: DbClient,
  tenantId: string,
): Promise<AdminActivity[]> {
  const rows = await client.db
    .select({
      id: activities.id,
      title: activities.title,
      kind: activities.kind,
      subject: activities.subject,
      approved: activities.approved,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .where(eq(activities.tenantId, tenantId))
    .orderBy(desc(activities.createdAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: String(r.kind),
    subject: r.subject ?? null,
    approved: Boolean(r.approved),
    createdAt: new Date(r.createdAt),
  }));
}

export interface AdminActivityDetail extends AdminActivity {
  content: string;
  gradeLevel: string | null;
  ageBand: string | null;
  aiGenerated: boolean;
  tags: string[];
}

/** Conteúdo completo de UMA atividade de um tenant (para "abrir tudo" no admin). */
export async function getTenantActivity(
  client: DbClient,
  tenantId: string,
  activityId: string,
): Promise<AdminActivityDetail | null> {
  const rows = await client.db
    .select()
    .from(activities)
    .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));
  const a = rows[0];
  if (!a) return null;
  return {
    id: a.id,
    title: a.title,
    kind: String(a.kind),
    subject: a.subject ?? null,
    approved: Boolean(a.approved),
    createdAt: new Date(a.createdAt),
    content: a.content ?? '',
    gradeLevel: a.gradeLevel ?? null,
    ageBand: a.ageBand ?? null,
    aiGenerated: Boolean(a.aiGenerated),
    tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
  };
}

// --- Visão GLOBAL do admin: tudo do produto, cross-tenant, com a conta de origem ----------
// Cap defensivo: até 1000 linhas por lista (o painel admin não pagina ainda; evita estourar).

const ADMIN_LIST_CAP = 1000;

export interface GlobalActivity {
  id: string;
  title: string;
  kind: string;
  subject: string | null;
  tenantId: string;
  tenantName: string;
  createdAt: Date;
}

export async function listAllActivities(client: DbClient): Promise<GlobalActivity[]> {
  const rows = await client.db
    .select({
      id: activities.id,
      title: activities.title,
      kind: activities.kind,
      subject: activities.subject,
      tenantId: activities.tenantId,
      tenantName: tenants.name,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .leftJoin(tenants, eq(tenants.id, activities.tenantId))
    .orderBy(desc(activities.createdAt))
    .limit(ADMIN_LIST_CAP);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: String(r.kind),
    subject: r.subject ?? null,
    tenantId: r.tenantId,
    tenantName: r.tenantName ?? '—',
    createdAt: new Date(r.createdAt),
  }));
}

export interface GlobalUser {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  tenantId: string;
  tenantName: string;
}

export async function listAllUsers(client: DbClient): Promise<GlobalUser[]> {
  const rows = await client.db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      name: users.fullName,
      email: users.email,
      tenantId: memberships.tenantId,
      tenantName: tenants.name,
    })
    .from(memberships)
    .leftJoin(users, eq(users.id, memberships.userId))
    .leftJoin(tenants, eq(tenants.id, memberships.tenantId))
    .limit(ADMIN_LIST_CAP);
  return rows.map((r) => ({
    userId: r.userId,
    name: r.name ?? null,
    email: r.email ?? null,
    role: String(r.role),
    tenantId: r.tenantId,
    tenantName: r.tenantName ?? '—',
  }));
}

export interface GlobalClass {
  id: string;
  name: string;
  gradeLevel: string | null;
  tenantId: string;
  tenantName: string;
  students: number;
}

export async function listAllClasses(client: DbClient): Promise<GlobalClass[]> {
  const rows = (await client.db.execute(sql`
    select
      ${classes.id} as id,
      ${classes.name} as name,
      ${classes.gradeLevel} as grade_level,
      ${classes.tenantId} as tenant_id,
      ${tenants.name} as tenant_name,
      (select count(*) from ${students}
        where ${students.classId} = ${classes.id} and ${students.deletedAt} is null) as students
    from ${classes}
    left join ${tenants} on ${tenants.id} = ${classes.tenantId}
    where ${classes.deletedAt} is null
    order by ${tenants.name}, ${classes.name}
    limit ${ADMIN_LIST_CAP}
  `)) as unknown as Array<{
    id: string;
    name: string;
    grade_level: string | null;
    tenant_id: string;
    tenant_name: string | null;
    students: number | string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    gradeLevel: r.grade_level ?? null,
    tenantId: r.tenant_id,
    tenantName: r.tenant_name ?? '—',
    students: Number(r.students ?? 0),
  }));
}

export interface GlobalStudent {
  id: string;
  fullName: string;
  tenantId: string;
  tenantName: string;
  className: string | null;
}

export async function listAllStudents(client: DbClient): Promise<GlobalStudent[]> {
  const rows = await client.db
    .select({
      id: students.id,
      fullName: students.fullName,
      tenantId: students.tenantId,
      tenantName: tenants.name,
      className: classes.name,
    })
    .from(students)
    .leftJoin(tenants, eq(tenants.id, students.tenantId))
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(isNull(students.deletedAt))
    .limit(ADMIN_LIST_CAP);
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    tenantId: r.tenantId,
    tenantName: r.tenantName ?? '—',
    className: r.className ?? null,
  }));
}

/** Tabelas tenant-scoped que devem ser purgadas ao apagar uma escola definitivamente. */
const TENANT_TABLES = [
  'memberships',
  'subscriptions',
  'entitlements',
  'usage_meters',
  'audit_log',
  'classes',
  'students',
  'activities',
  'ai_drafts',
  'units',
  'invitations',
  'academic_years',
  'terms',
  'subjects',
  'guardians',
  'student_guardians',
  'lessons',
  'grades',
  'attendance',
  'communications',
  'portfolio_entries',
  'events',
];

/** Soft delete da escola/tenant (reversível). Operação de super-admin (server-only). */
export async function softDeleteTenant(client: DbClient, tenantId: string) {
  await client.db.update(tenants).set({ deletedAt: new Date() }).where(eq(tenants.id, tenantId));
}

export async function restoreTenant(client: DbClient, tenantId: string) {
  await client.db.update(tenants).set({ deletedAt: null }).where(eq(tenants.id, tenantId));
}

/**
 * Exclusão DEFINITIVA da escola: apaga todos os dados do tenant (todas as tabelas) e o
 * próprio tenant. NÃO apaga contas de auth (o Supabase Auth é compartilhado com outro app).
 * Irreversível: a UI exige confirmação forte.
 */
export async function purgeTenant(client: DbClient, tenantId: string) {
  for (const table of TENANT_TABLES) {
    await client.sql.unsafe(`delete from on_education.${table} where tenant_id = $1`, [tenantId]);
  }
  await client.sql.unsafe(`delete from on_education.tenants where id = $1`, [tenantId]);
}
