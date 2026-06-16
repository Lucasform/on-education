import { type DbClient, entitlements, subscriptions } from '@on-education/db';
import { type Feature, getPlan } from '@on-education/entitlements';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * Perna comercial da checagem tripla (RLS + RBAC + entitlement).
 *
 * Fonte de verdade por tenant: a tabela `entitlements` (uma linha por funcionalidade ligada).
 * Combos e à la carte ambos escrevem lá. Resolução com fallback SEGURO:
 *  1. Se há linhas de entitlement → usa esse conjunto (gating ativo para o tenant).
 *  2. Senão, se há plano (subscription) → usa as features do plano.
 *  3. Senão → `null` = tenant sem escolha = tudo liberado (não trava nada legado).
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

/**
 * Conjunto de funcionalidades habilitadas do tenant. `null` = ungated (libera tudo) —
 * acontece com tenants legados que ainda não escolheram plano nem têm entitlements.
 */
export async function getTenantFeatures(
  client: DbClient,
  tenantId: string,
): Promise<Set<Feature> | null> {
  const rows = await client.withTenant(tenantId, (tx) =>
    tx
      .select({ feature: entitlements.feature, enabled: entitlements.enabled })
      .from(entitlements)
      .where(isNull(entitlements.deletedAt)),
  );
  const enabled = rows.filter((r) => r.enabled).map((r) => r.feature as Feature);
  if (rows.length > 0) return new Set(enabled);

  // Sem linhas de entitlement: cai no plano, se houver.
  const planId = await getTenantPlanId(client, tenantId);
  const plan = planId ? getPlan(planId) : undefined;
  if (plan) return new Set(plan.features);

  return null; // ungated
}

/** Versão não-throwing: o tenant tem a feature habilitada? (ungated → true). */
export async function isEntitled(
  client: DbClient,
  tenantId: string,
  feature: Feature,
): Promise<boolean> {
  const features = await getTenantFeatures(client, tenantId);
  return features === null ? true : features.has(feature);
}

/**
 * Garante que o tenant habilita `feature`; lança se não. Retorna o planId (pode ser '' em
 * tenant ungated) para reuso na checagem de cota.
 */
export async function assertEntitled(
  client: DbClient,
  tenantId: string,
  feature: Feature,
): Promise<string> {
  const [features, planId] = await Promise.all([
    getTenantFeatures(client, tenantId),
    getTenantPlanId(client, tenantId),
  ]);
  if (features !== null && !features.has(feature)) {
    throw new Error(`Plano do tenant não habilita a funcionalidade: ${feature}`);
  }
  return planId ?? '';
}
