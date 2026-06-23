import {
  createSupportTicket,
  listMyTickets,
  listSupportMessages,
  replyTicketAsUser,
} from '@on-education/module-nucleo';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ tickets: [] });
  const tickets = await listMyTickets(db(), ctx).catch(() => []);
  const withMsgs = await Promise.all(
    tickets.map(async (t) => ({
      ...t,
      messages: await listSupportMessages(db(), ctx, t.id).catch(() => []),
    })),
  );
  return NextResponse.json({ tickets: withMsgs });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  let body: { kind?: string; body?: string; ticketId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'requisição inválida' }, { status: 400 });
  }
  const text = String(body?.body ?? '').slice(0, 4000).trim();
  if (!text) return NextResponse.json({ error: 'mensagem vazia' }, { status: 400 });
  try {
    if (body.ticketId) {
      await replyTicketAsUser(db(), ctx, body.ticketId, text);
    } else {
      await createSupportTicket(db(), ctx, { kind: String(body.kind ?? 'sugestao'), body: text });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
