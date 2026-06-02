import {
  activities,
  classes,
  type DbClient,
  memberships,
  students,
  tenants,
} from '@on-education/db';
import type { TenantType } from '@on-education/core';
import { count, countDistinct, desc, eq, isNull } from 'drizzle-orm';

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
  const base = client.db
    .select({
      id: tenants.id,
      name: tenants.name,
      tenantType: tenants.tenantType,
      createdAt: tenants.createdAt,
      deletedAt: tenants.deletedAt,
    })
    .from(tenants);
  const rows = await (opts.includeDeleted
    ? base.orderBy(desc(tenants.createdAt))
    : base.where(isNull(tenants.deletedAt)).orderBy(desc(tenants.createdAt)));

  const memberCounts = await client.db
    .select({ tenantId: memberships.tenantId, c: countDistinct(memberships.userId) })
    .from(memberships)
    .groupBy(memberships.tenantId);
  const studentCounts = await client.db
    .select({ tenantId: students.tenantId, c: count() })
    .from(students)
    .groupBy(students.tenantId);

  const memberBy = new Map(memberCounts.map((r) => [r.tenantId, Number(r.c)]));
  const studentBy = new Map(studentCounts.map((r) => [r.tenantId, Number(r.c)]));

  return rows.map((t) => ({
    ...t,
    members: memberBy.get(t.id) ?? 0,
    students: studentBy.get(t.id) ?? 0,
  }));
}

export async function getAppStats(client: DbClient): Promise<AppStats> {
  const [allTenants, byType, users, studentsTotal, classesTotal, activitiesTotal] =
    await Promise.all([
      client.db.select({ c: count() }).from(tenants).where(isNull(tenants.deletedAt)),
      client.db
        .select({ tenantType: tenants.tenantType, c: count() })
        .from(tenants)
        .where(isNull(tenants.deletedAt))
        .groupBy(tenants.tenantType),
      client.db.select({ c: countDistinct(memberships.userId) }).from(memberships),
      client.db.select({ c: count() }).from(students),
      client.db.select({ c: count() }).from(classes),
      client.db.select({ c: count() }).from(activities),
    ]);

  const orgRow = byType.find((r) => r.tenantType === 'organization');
  const indRow = byType.find((r) => r.tenantType === 'individual');

  return {
    tenants: Number(allTenants[0]?.c ?? 0),
    organizations: Number(orgRow?.c ?? 0),
    individuals: Number(indRow?.c ?? 0),
    users: Number(users[0]?.c ?? 0),
    students: Number(studentsTotal[0]?.c ?? 0),
    classes: Number(classesTotal[0]?.c ?? 0),
    activities: Number(activitiesTotal[0]?.c ?? 0),
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
