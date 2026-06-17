import {
  findInvoiceTenantByExternalCharge,
  markInvoicePaidByExternalCharge,
} from '@on-education/module-nucleo';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';
import { resolvePaymentProvider } from '@/server/payments';

export const dynamic = 'force-dynamic';

/**
 * Webhook do PSP de MENSALIDADE (Asaas/Iugu). Verifica o evento pelo provider configurado
 * e, num evento 'paid', dá baixa na fatura. O webhook não conhece o tenant: descobrimos o
 * tenant pela fatura via externalChargeId (client.db, bypass de RLS) e então marcamos paga.
 * Idempotente. Sem PSP configurado, verifyWebhook do noop retorna null -> 200 silencioso.
 */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const event = resolvePaymentProvider().verifyWebhook(payload, req.headers);
  if (!event) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });

  if (event.status !== 'paid') {
    return NextResponse.json({ received: true, ignored: event.status });
  }

  try {
    const tenantId = await findInvoiceTenantByExternalCharge(db(), event.externalChargeId);
    if (!tenantId) {
      return NextResponse.json({ received: true, skipped: 'fatura não encontrada' });
    }
    await markInvoicePaidByExternalCharge(db(), tenantId, event.externalChargeId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
