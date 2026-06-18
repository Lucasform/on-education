import {
  type DbClient,
  entitlements,
  memberships,
  subscriptions,
  tenants,
  usageMeters,
} from '@on-education/db';
import { PLANS } from '@on-education/entitlements';
import type { IndividualSignupInput } from '@on-education/validation';

/** Plano default do professor autônomo no signup (Fase 1B.1, Master Spec §3.3). */
export const DEFAULT_INDIVIDUAL_PLAN = 'teacher_free';

export interface ProvisionResult {
  tenantId: string;
  planId: string;
}

/** Período corrente no formato 'YYYY-MM' para os medidores de cota. */
function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Cria um tenant `individual` completo a partir de um signup (Fase 1B.1):
 * tenant + membership (owner acumula teacher) + subscription teacher_free +
 * entitlements semeados do plano + medidor de tokens de IA do período.
 *
 * ATENÇÃO: é operação ADMINISTRATIVA. Roda com a conexão `client.db` direta (papel de
 * serviço, server-only) porque acontece ANTES de existir contexto de tenant na sessão —
 * não há `app.tenant_id` para o RLS. Nunca expor este caminho ao client.
 */
export async function provisionIndividualTenant(
  client: DbClient,
  ownerUserId: string,
  input: IndividualSignupInput,
): Promise<ProvisionResult> {
  const plan = PLANS[DEFAULT_INDIVIDUAL_PLAN];
  if (!plan) throw new Error(`Plano default ausente no catálogo: ${DEFAULT_INDIVIDUAL_PLAN}`);

  return client.db.transaction(async (tx) => {
    const inserted = await tx
      .insert(tenants)
      .values({
        tenantType: 'individual',
        name: input.workspaceName ?? input.ownerName,
        slug: input.slug || null,
        createdBy: ownerUserId,
      })
      .returning({ id: tenants.id });
    const tenantId = inserted[0]?.id;
    if (!tenantId) throw new Error('Falha ao criar tenant individual.');

    // No individual, o owner acumula o papel de teacher (Master Spec §6.2).
    await tx.insert(memberships).values([
      { tenantId, userId: ownerUserId, role: 'owner', createdBy: ownerUserId },
      { tenantId, userId: ownerUserId, role: 'teacher', createdBy: ownerUserId },
    ]);

    await tx
      .insert(subscriptions)
      .values({ tenantId, planId: DEFAULT_INDIVIDUAL_PLAN, createdBy: ownerUserId });

    const featureRows = [...plan.features].map((feature) => ({
      tenantId,
      feature,
      enabled: true,
      createdBy: ownerUserId,
    }));
    if (featureRows.length > 0) await tx.insert(entitlements).values(featureRows);

    await tx.insert(usageMeters).values({
      tenantId,
      metric: 'ai_tokens',
      period: currentPeriod(),
      used: 0,
      createdBy: ownerUserId,
    });

    return { tenantId, planId: DEFAULT_INDIVIDUAL_PLAN };
  });
}
