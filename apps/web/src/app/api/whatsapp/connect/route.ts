import {
  getWhatsappConnection,
  setWhatsappState,
  upsertWhatsappConnection,
} from '@on-education/module-nucleo';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import {
  evoConnect,
  evoEnsureInstance,
  evoSetWebhook,
  evoState,
  instanceNameFor,
  whatsappConfigured,
} from '@/server/whatsapp';

export const dynamic = 'force-dynamic';

/** Cria/garante a instância, registra o webhook e devolve o QR para conectar o número. */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!whatsappConfigured()) {
    return NextResponse.json({ error: 'WhatsApp não configurado no servidor.' }, { status: 503 });
  }
  const inst = instanceNameFor(ctx.tenantId);
  try {
    await evoEnsureInstance(inst);
    const existing = await getWhatsappConnection(db(), ctx);
    const secret = existing?.webhookSecret ?? crypto.randomUUID();
    await evoSetWebhook(inst, `${req.nextUrl.origin}/api/whatsapp/webhook?secret=${secret}`);
    await upsertWhatsappConnection(db(), ctx, { instanceId: inst, webhookSecret: secret });
    const { qrBase64, pairingCode } = await evoConnect(inst);
    const status = await evoState(inst);
    if (status === 'open') await setWhatsappState(db(), ctx, { active: true });
    return NextResponse.json({ status, qr: qrBase64, pairing: pairingCode });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'erro ao conectar' },
      { status: 500 },
    );
  }
}
