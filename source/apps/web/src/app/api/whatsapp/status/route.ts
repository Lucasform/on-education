import { getWhatsappConnection, setWhatsappState } from '@on-education/module-nucleo';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { evoState, whatsappConfigured } from '@/server/whatsapp';

export const dynamic = 'force-dynamic';

/** Estado atual da conexão (para o polling do front). */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const conn = await getWhatsappConnection(db(), ctx);
  if (!conn) return NextResponse.json({ status: 'close', active: false, phone: null });
  if (!whatsappConfigured()) {
    return NextResponse.json({ status: 'close', active: conn.active, phone: conn.phone });
  }
  const status = await evoState(conn.instanceId);
  const active = status === 'open';
  if (active !== conn.active) await setWhatsappState(db(), ctx, { active });
  return NextResponse.json({ status, active, phone: conn.phone });
}
