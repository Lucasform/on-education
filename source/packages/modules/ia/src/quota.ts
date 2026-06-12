import { loadEnv } from '@on-education/config';
import { type DbClient, usageMeters } from '@on-education/db';
import { limitFor } from '@on-education/entitlements';
import { and, eq, sql } from 'drizzle-orm';

import { tenantUsesOwnAi } from './byok';

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
  // BYOK: com a própria chave, não há nossa cota (os tokens são do tenant).
  if (await tenantUsesOwnAi(client, tenantId)) return;
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
  // BYOK: não medimos o consumo de quem usa a própria chave.
  if (await tenantUsesOwnAi(client, tenantId)) return;
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

// === Imagens (gpt-image-1): cota por tenant + teto GLOBAL da plataforma ====================

const METRIC_IMAGES = 'images';

/** Quantas imagens o tenant já gerou no período. */
export async function getUsedImages(
  client: DbClient,
  tenantId: string,
  period: string = currentPeriod(),
): Promise<number> {
  return client.withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ used: usageMeters.used })
      .from(usageMeters)
      .where(and(eq(usageMeters.metric, METRIC_IMAGES), eq(usageMeters.period, period)));
    return rows[0]?.used ?? 0;
  });
}

/** Total de imagens geradas por TODOS os tenants no período (para o teto global). */
export async function getGlobalImages(
  client: DbClient,
  period: string = currentPeriod(),
): Promise<number> {
  const rows = await client.db
    .select({ total: sql<number>`coalesce(sum(${usageMeters.used}), 0)` })
    .from(usageMeters)
    .where(and(eq(usageMeters.metric, METRIC_IMAGES), eq(usageMeters.period, period)));
  return Number(rows[0]?.total ?? 0);
}

export async function imagesRemaining(
  client: DbClient,
  tenantId: string,
  planId: string,
): Promise<number> {
  const limit = limitFor(planId, 'imagesPerMonth');
  if (limit === undefined) return 0; // plano sem imagem
  if (limit === -1) return Number.POSITIVE_INFINITY;
  const used = await getUsedImages(client, tenantId);
  return Math.max(0, limit - used);
}

/** Garante cota do tenant E o teto global antes de gerar uma imagem. */
export async function assertImageQuota(
  client: DbClient,
  tenantId: string,
  planId: string,
): Promise<void> {
  if ((await imagesRemaining(client, tenantId, planId)) <= 0) {
    throw new Error('Cota mensal de imagens esgotada para o plano.');
  }
  const globalCap = loadEnv().IMAGE_MONTHLY_GLOBAL_CAP ?? 2000;
  if ((await getGlobalImages(client)) >= globalCap) {
    throw new Error('Limite global de imagens da plataforma atingido neste mês.');
  }
}

/** Registra +n imagens no medidor do tenant. */
export async function recordImages(
  client: DbClient,
  tenantId: string,
  count = 1,
  period: string = currentPeriod(),
): Promise<void> {
  if (count <= 0) return;
  await client.withTenant(tenantId, (tx) =>
    tx
      .insert(usageMeters)
      .values({ tenantId, metric: METRIC_IMAGES, period, used: count })
      .onConflictDoUpdate({
        target: [usageMeters.tenantId, usageMeters.metric, usageMeters.period],
        set: { used: sql`${usageMeters.used} + ${count}`, updatedAt: new Date() },
      }),
  );
}
