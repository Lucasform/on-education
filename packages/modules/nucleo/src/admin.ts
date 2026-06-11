import {
  activities,
  classes,
  type DbClient,
  memberships,
  students,
  tenants,
} from '@on-education/db';
import type { TenantType } from '@on-education/core';
import { count, countDistinct, eq, sql } from 'drizzle-orm';

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
    members: number | string;
    students: number | string;
  }>;

  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    tenantType: t.tenant_type,
    createdAt: new Date(t.created_at),
    deletedAt: t.deleted_at ? new Date(t.deleted_at) : null,
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
  const t = (
    await client.db
      .select({
        id: tenants.id,
        name: tenants.name,
        tenantType: tenants.tenantType,
        createdAt: tenants.createdAt,
        deletedAt: tenants.deletedAt,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
  )[0];
  if (!t) return null;

  const [members, studentsTotal, classesTotal, activitiesTotal, rolesRows] = await Promise.all([
    client.db
      .select({ c: countDistinct(memberships.userId) })
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId)),
    client.db.select({ c: count() }).from(students).where(eq(students.tenantId, tenantId)),
    client.db.select({ c: count() }).from(classes).where(eq(classes.tenantId, tenantId)),
    client.db.select({ c: count() }).from(activities).where(eq(activities.tenantId, tenantId)),
    client.db
      .select({ role: memberships.role, c: count() })
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId))
      .groupBy(memberships.role),
  ]);

  return {
    ...t,
    members: Number(members[0]?.c ?? 0),
    students: Number(studentsTotal[0]?.c ?? 0),
    classes: Number(classesTotal[0]?.c ?? 0),
    activities: Number(activitiesTotal[0]?.c ?? 0),
    roles: rolesRows.map((r) => ({ role: String(r.role), count: Number(r.c) })),
  };
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
