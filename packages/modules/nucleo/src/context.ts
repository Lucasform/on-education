import type { AuthContext } from '@on-education/auth';
import { type DbClient, memberships, tenants } from '@on-education/db';
import { eq } from 'drizzle-orm';

/** Id sintético usado pelo super-admin ao operar como um tenant (view-as). */
export const ADMIN_USER_ID = '00000000-0000-0000-0000-0000000000ad';

/**
 * Contexto de view-as: o super-admin "entra" num tenant e opera com acesso total.
 * Retorna null se o tenant não existir.
 */
export async function resolveContextForTenant(
  client: DbClient,
  tenantId: string,
): Promise<AuthContext | null> {
  const t = await client.db
    .select({ tenantType: tenants.tenantType })
    .from(tenants)
    .where(eq(tenants.id, tenantId));
  if (t.length === 0) return null;
  return {
    userId: ADMIN_USER_ID,
    tenantId,
    tenantType: t[0]!.tenantType,
    roles: ['owner', 'director', 'teacher'],
  };
}

/**
 * Resolve o AuthContext a partir do id do usuário autenticado (Supabase Auth).
 * É um lookup de bootstrap (antes de existir contexto de tenant na sessão), então roda na
 * conexão admin (`client.db`). Retorna null se o usuário ainda não tem membership.
 *
 * Multi-tenant: por ora assume o primeiro tenant do usuário (troca de tenant fica para depois).
 */
export async function resolveContextForUser(
  client: DbClient,
  userId: string,
): Promise<AuthContext | null> {
  const rows = await client.db
    .select({ tenantId: memberships.tenantId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, userId));
  if (rows.length === 0) return null;

  const tenantId = rows[0]!.tenantId;
  const roles = rows.filter((r) => r.tenantId === tenantId).map((r) => r.role);

  const t = await client.db
    .select({ tenantType: tenants.tenantType })
    .from(tenants)
    .where(eq(tenants.id, tenantId));
  if (t.length === 0) return null;

  return { userId, tenantId, tenantType: t[0]!.tenantType, roles };
}
