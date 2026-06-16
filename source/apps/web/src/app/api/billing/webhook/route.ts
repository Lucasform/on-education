import type { TenantType } from '@on-education/core';
import { type Feature, FEATURES } from '@on-education/entitlements';
import { applyComboPlanForTenant, setFeaturesForTenant } from '@on-education/module-nucleo';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';
import { verifyStripeWebhook } from '@/server/billing';

export const dynamic = 'force-dynamic';

/**
 * Webhook do Stripe. Verifica a assinatura e, em eventos de assinatura paga/atualizada,
 * aplica o plano (combo) ou o pacote à la carte no tenant — a mesma operação da tela de
 * planos, mas disparada pelo pagamento. Idempotente: aplicar o mesmo conjunto repete o
 * estado final, sem efeito colateral.
 */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const event = verifyStripeWebhook(payload, req.headers.get('stripe-signature'));
  if (!event) return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 });

  // Eventos que confirmam acesso pago. Cancelamentos/expiração poderiam reverter para free
  // num passo futuro; aqui focamos em LIBERAR o que foi pago.
  const RELEVANT = new Set([
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
  ]);
  if (!RELEVANT.has(event.type)) return NextResponse.json({ received: true });

  const obj = event.data.object as { metadata?: Record<string, string> };
  const meta = obj.metadata ?? {};
  const tenantId = meta.tenantId;
  if (!tenantId) return NextResponse.json({ received: true, skipped: 'sem tenantId' });

  try {
    if (meta.kind === 'combo' && meta.planId) {
      await applyComboPlanForTenant(db(), tenantId, meta.planId);
    } else if (meta.kind === 'alacarte') {
      const valid = new Set<string>(FEATURES);
      const features = (meta.features ?? '')
        .split(',')
        .map((f) => f.trim())
        .filter((f) => valid.has(f)) as Feature[];
      const tenantType = (meta.tenantType as TenantType) ?? 'organization';
      await setFeaturesForTenant(db(), tenantId, tenantType, features);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
