import { findConnectionBySecret, recordIncomingMessage } from '@on-education/module-nucleo';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

type EvoPayload = {
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    pushName?: string;
  };
};

function parsePayload(body: EvoPayload): {
  phone: string | null;
  text: string | null;
  fromMe: boolean;
  messageId?: string;
  name?: string;
} {
  const d = body?.data;
  const jid = d?.key?.remoteJid;
  const txt = d?.message?.conversation ?? d?.message?.extendedTextMessage?.text;
  if (jid && txt) {
    return {
      phone: String(jid).split('@')[0]?.replace(/\D/g, '') ?? null,
      text: txt,
      fromMe: d?.key?.fromMe ?? false,
      messageId: d?.key?.id,
      name: d?.pushName,
    };
  }
  return { phone: null, text: null, fromMe: false };
}

/** Endpoint público chamado pelo Evolution ao receber mensagem. Valida `?secret=`. */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret) return NextResponse.json({ error: 'secret obrigatório' }, { status: 401 });

  const conn = await findConnectionBySecret(db(), secret).catch(() => null);
  if (!conn) return NextResponse.json({ error: 'secret inválido' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as EvoPayload;
  const p = parsePayload(body);
  if (!p.phone || !p.text || p.fromMe) return NextResponse.json({ skipped: true });

  await recordIncomingMessage(db(), conn.tenantId, {
    phone: p.phone,
    text: p.text,
    contactName: p.name ?? null,
    waMessageId: p.messageId ?? null,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
