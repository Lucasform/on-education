import {
  activities,
  classes,
  type DbClient,
  memberships,
  students,
  tenants,
} from '@on-education/db';
import type { TenantType } from '@on-education/core';
import { count, countDistinct, desc, eq } from 'drizzle-orm';

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

export async function listAllTenants(client: DbClient): Promise<TenantOverview[]> {
  const rows = await client.db
    .select({
      id: tenants.id,
      name: tenants.name,
      tenantType: tenants.tenantType,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .orderBy(desc(tenants.createdAt));

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
      client.db.select({ c: count() }).from(tenants),
      client.db
        .select({ tenantType: tenants.tenantType, c: count() })
        .from(tenants)
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

// Evita "import não usado" enquanto eq não é necessário aqui; mantém a porta aberta.
export const __adminInternals = { eq };
