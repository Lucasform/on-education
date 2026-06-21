import { assertCan, type AuthContext } from '@on-education/auth';
import type { TenantType } from '@on-education/core';
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
  userId: string | null,
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
  userId: string | null,
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

// --- Núcleo (service): sem RBAC. Uso server-only (webhook de pagamento, provisionamento). --

/** Ativa um plano combo para um tenant pelo id (service-level, sem checagem de papel). */
export async function applyComboPlanForTenant(
  client: DbClient,
  tenantId: string,
  planId: string,
  actorUserId: string | null = null,
) {
  const plan = getPlan(planId);
  if (!plan) throw new Error(`Plano inexistente: ${planId}`);
  await client.withTenant(tenantId, async (tx) => {
    await setActiveSubscription(tx, tenantId, actorUserId, planId);
    await syncEntitlements(tx, tenantId, actorUserId, [...plan.features]);
  });
}

/**
 * Override de ADMIN (super-admin): liga EXATAMENTE o conjunto de features informado para o
 * tenant, sem o mínimo do à la carte e sem mexer na assinatura. As `entitlements` passam a
 * existir → viram a fonte de verdade (sobrepõem o plano). Conjunto vazio = trava tudo.
 */
export async function setTenantEntitlements(
  client: DbClient,
  tenantId: string,
  features: Feature[],
  actorUserId: string | null = null,
) {
  const unique = [...new Set(features)];
  await client.withTenant(tenantId, async (tx) => {
    await syncEntitlements(tx, tenantId, actorUserId, unique);
  });
}

/** Ativa um pacote à la carte para um tenant pelo id (service-level). Valida mínimo/elegibilidade. */
export async function setFeaturesForTenant(
  client: DbClient,
  tenantId: string,
  tenantType: TenantType,
  features: Feature[],
  actorUserId: string | null = null,
) {
  const eligible = new Set(featuresForSegment(tenantType).map((m) => m.feature));
  const chosen = [...new Set(features)].filter((f) => eligible.has(f));
  const min = ALACARTE_MIN[tenantType];
  if (chosen.length < min) throw new Error(`Selecione no mínimo ${min} funcionalidades.`);
  const customPlan = tenantType === 'individual' ? 'teacher_custom' : 'school_custom';
  await client.withTenant(tenantId, async (tx) => {
    await setActiveSubscription(tx, tenantId, actorUserId, customPlan);
    await syncEntitlements(tx, tenantId, actorUserId, chosen);
  });
}

// --- UI (guarded): checagem de papel. ----------------------------------------

/**
 * Ativa um plano COMBO: define a assinatura e liga exatamente as funcionalidades do plano.
 * O app passa a refletir o plano na hora (autônomo, sem liberação manual).
 */
export async function applyComboPlan(client: DbClient, ctx: AuthContext, planId: string) {
  assertCan(ctx, 'update', 'setting');
  const plan = getPlan(planId);
  if (!plan) throw new Error(`Plano inexistente: ${planId}`);
  if (plan.tenantType !== ctx.tenantType) throw new Error('Plano incompatível com o tipo de conta.');
  await applyComboPlanForTenant(client, ctx.tenantId, planId, ctx.userId);
}

/** Ativa um pacote À LA CARTE com checagem de papel. */
export async function setTenantFeatures(client: DbClient, ctx: AuthContext, features: Feature[]) {
  assertCan(ctx, 'update', 'setting');
  await setFeaturesForTenant(client, ctx.tenantId, ctx.tenantType, features, ctx.userId);
}
