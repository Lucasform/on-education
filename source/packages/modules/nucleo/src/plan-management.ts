import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, entitlements, subscriptions } from '@on-education/db';
import {
  ALACARTE_MIN,
  type Feature,
  featuresForSegment,
  getPlan,
} from '@on-education/entitlements';
import { and, eq, isNull, sql } from 'drizzle-orm';

/** Sincroniza a tabela `entitlements` do tenant para EXATAMENTE o conjunto informado. */
async function syncEntitlements(
  tx: DbClient['db'],
  tenantId: string,
  userId: string,
  features: Feature[],
) {
  // Desliga tudo que existe; depois liga (upsert) só o conjunto desejado.
  await tx
    .update(entitlements)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(entitlements.tenantId, tenantId));
  for (const feature of features) {
    await tx
      .insert(entitlements)
      .values({ tenantId, feature, enabled: true, createdBy: userId })
      .onConflictDoUpdate({
        target: [entitlements.tenantId, entitlements.feature],
        set: { enabled: true, deletedAt: null, updatedAt: sql`now()` },
      });
  }
}

/** Define a assinatura ativa do tenant para `planId` (uma ativa por vez). */
async function setActiveSubscription(
  tx: DbClient['db'],
  tenantId: string,
  userId: string,
  planId: string,
) {
  const existing = await tx
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), isNull(subscriptions.deletedAt)));
  if (existing[0]) {
    await tx
      .update(subscriptions)
      .set({ planId, updatedAt: new Date() })
      .where(eq(subscriptions.id, existing[0].id));
  } else {
    await tx.insert(subscriptions).values({ tenantId, planId, createdBy: userId });
  }
}

/**
 * Ativa um plano COMBO: define a assinatura e liga exatamente as funcionalidades do plano.
 * O app passa a refletir o plano na hora (autônomo, sem liberação manual).
 */
export async function applyComboPlan(client: DbClient, ctx: AuthContext, planId: string) {
  assertCan(ctx, 'update', 'setting');
  const plan = getPlan(planId);
  if (!plan) throw new Error(`Plano inexistente: ${planId}`);
  if (plan.tenantType !== ctx.tenantType) throw new Error('Plano incompatível com o tipo de conta.');
  await client.withTenant(ctx.tenantId, async (tx) => {
    await setActiveSubscription(tx, ctx.tenantId, ctx.userId, planId);
    await syncEntitlements(tx, ctx.tenantId, ctx.userId, [...plan.features]);
  });
}

/**
 * Ativa um pacote À LA CARTE: valida o mínimo do segmento e a elegibilidade, marca a
 * assinatura como `*_custom` e liga exatamente as funcionalidades escolhidas.
 */
export async function setTenantFeatures(
  client: DbClient,
  ctx: AuthContext,
  features: Feature[],
) {
  assertCan(ctx, 'update', 'setting');
  const eligible = new Set(featuresForSegment(ctx.tenantType).map((m) => m.feature));
  const chosen = [...new Set(features)].filter((f) => eligible.has(f));
  const min = ALACARTE_MIN[ctx.tenantType];
  if (chosen.length < min) {
    throw new Error(`Selecione no mínimo ${min} funcionalidades.`);
  }
  const customPlan = ctx.tenantType === 'individual' ? 'teacher_custom' : 'school_custom';
  await client.withTenant(ctx.tenantId, async (tx) => {
    await setActiveSubscription(tx, ctx.tenantId, ctx.userId, customPlan);
    await syncEntitlements(tx, ctx.tenantId, ctx.userId, chosen);
  });
}
