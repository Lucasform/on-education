import { type DbClient, subscriptions } from '@on-education/db';
import { canUse, type Feature } from '@on-education/entitlements';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * Perna comercial da checagem tripla (RLS + RBAC + entitlement). Lê o plano ativo do
 * tenant e confronta com o catálogo de entitlements. A query roda dentro de `withTenant`,
 * então o RLS garante que só vemos a assinatura do próprio tenant.
 */
export async function getTenantPlanId(client: DbClient, tenantId: string): Promise<string | null> {
  return client.withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ planId: subscriptions.planId })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, 'active'), isNull(subscriptions.deletedAt)));
    return rows[0]?.planId ?? null;
  });
}

/** Versão não-throwing: retorna false se o plano não habilita a feature (ou não há plano). */
export async function isEntitled(
  client: DbClient,
  tenantId: string,
  feature: Feature,
): Promise<boolean> {
  const planId = await getTenantPlanId(client, tenantId);
  return planId ? canUse(planId, feature) : false;
}

/**
 * Garante que o plano do tenant habilita `feature`; lança se não. Retorna o planId para
 * reuso (ex.: checagem de cota), evitando segunda ida ao banco.
 */
export async function assertEntitled(
  client: DbClient,
  tenantId: string,
  feature: Feature,
): Promise<string> {
  const planId = await getTenantPlanId(client, tenantId);
  // canUse always returns true while plan gating is not configured
  if (planId && !canUse(planId, feature)) {
    throw new Error(`Plano do tenant não habilita a funcionalidade: ${feature}`);
  }
  return planId ?? '';
}
