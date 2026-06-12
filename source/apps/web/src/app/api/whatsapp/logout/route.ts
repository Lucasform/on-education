import { getWhatsappConnection, setWhatsappState } from '@on-education/module-nucleo';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { evoLogout, whatsappConfigured } from '@/server/whatsapp';

export const dynamic = 'force-dynamic';

/** Desconecta o número (mantém a instância para reconectar depois). */
export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const conn = await getWhatsappConnection(db(), ctx);
  if (conn && whatsappConfigured()) await evoLogout(conn.instanceId);
  if (conn) await setWhatsappState(db(), ctx, { active: false, phone: null });
  return NextResponse.json({ ok: true });
}
