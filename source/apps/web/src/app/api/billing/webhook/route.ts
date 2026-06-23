import type { TenantType } from '@on-education/core';
import { type Feature, FEATURES, freePlanFor } from '@on-education/entitlements';
import { applyComboPlanForTenant, setFeaturesForTenant } from '@on-education/module-nucleo';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';
import { verifyStripeWebhook } from '@/server/billing';
import { featuresTag } from '@/server/cached';

export const dynamic = 'force-dynamic';

// Eventos que confirmam acesso pago → LIBERA o plano/pacote dos metadados.
const GRANT = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
]);
// Eventos que tiram acesso → rebaixa para o plano free do segmento.
const REVOKE = new Set(['customer.subscription.deleted']);
// Status de assinatura que, mesmo em `updated`, indicam acesso suspenso.
const INACTIVE_STATUS = new Set(['canceled', 'unpaid', 'incomplete_expired', 'paused']);

/**
 * Webhook do Stripe. Verifica a assinatura e:
 *  - libera o plano/pacote pago (combo ou à la carte) ao confirmar pagamento;
 *  - rebaixa para o free do segmento ao cancelar/expirar/ficar inadimplente.
 * Tudo idempotente: aplicar o mesmo estado repete o resultado, sem efeito colateral.
 */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const event = verifyStripeWebhook(payload, req.headers.get('stripe-signature'));
  if (!event) return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 });

  if (!GRANT.has(event.type) && !REVOKE.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const obj = event.data.object as { metadata?: Record<string, string>; status?: string };
  const meta = obj.metadata ?? {};
  const tenantId = meta.tenantId;
  if (!tenantId) return NextResponse.json({ received: true, skipped: 'sem tenantId' });

  const tenantType = (meta.tenantType as TenantType) ?? 'organization';
  // updated com status suspenso conta como revogação.
  const revoke =
    REVOKE.has(event.type) || (obj.status != null && INACTIVE_STATUS.has(obj.status));

  try {
    if (revoke) {
      await applyComboPlanForTenant(db(), tenantId, freePlanFor(tenantType));
    } else if (meta.kind === 'combo' && meta.planId) {
      await applyComboPlanForTenant(db(), tenantId, meta.planId);
    } else if (meta.kind === 'alacarte') {
      const valid = new Set<string>(FEATURES);
      const features = (meta.features ?? '')
        .split(',')
        .map((f) => f.trim())
        .filter((f) => valid.has(f)) as Feature[];
      await setFeaturesForTenant(db(), tenantId, tenantType, features);
    }
    revalidateTag(featuresTag(tenantId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
