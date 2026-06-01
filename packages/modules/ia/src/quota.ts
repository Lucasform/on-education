import { type DbClient, usageMeters } from '@on-education/db';
import { limitFor } from '@on-education/entitlements';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Cota de IA por tenant (Master Spec §9.3, essencial no freemium). Mede tokens consumidos
 * no período e impõe o limite do plano (`aiTokensPerMonth`). -1/undefined = ilimitado.
 */
const METRIC = 'ai_tokens';

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

export async function getUsedTokens(
  client: DbClient,
  tenantId: string,
  period: string = currentPeriod(),
): Promise<number> {
  return client.withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ used: usageMeters.used })
      .from(usageMeters)
      .where(and(eq(usageMeters.metric, METRIC), eq(usageMeters.period, period)));
    return rows[0]?.used ?? 0;
  });
}

export function tokensRemaining(limit: number | undefined, used: number): number {
  if (limit === undefined || limit === -1) return Number.POSITIVE_INFINITY;
  return Math.max(0, limit - used);
}

export async function assertWithinQuota(
  client: DbClient,
  tenantId: string,
  planId: string,
): Promise<void> {
  const used = await getUsedTokens(client, tenantId);
  const limit = limitFor(planId, 'aiTokensPerMonth');
  if (tokensRemaining(limit, used) <= 0) {
    throw new Error('Cota mensal de IA esgotada para o plano. Faça upgrade para continuar.');
  }
}

/** Incrementa o consumo do período (upsert idempotente por tenant+metric+period). */
export async function recordUsage(
  client: DbClient,
  tenantId: string,
  tokens: number,
  period: string = currentPeriod(),
): Promise<void> {
  if (tokens <= 0) return;
  await client.withTenant(tenantId, (tx) =>
    tx
      .insert(usageMeters)
      .values({ tenantId, metric: METRIC, period, used: tokens })
      .onConflictDoUpdate({
        target: [usageMeters.tenantId, usageMeters.metric, usageMeters.period],
        set: { used: sql`${usageMeters.used} + ${tokens}`, updatedAt: new Date() },
      }),
  );
}
