import { runDunning } from '@on-education/module-nucleo';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron diário da régua de cobrança (#7). Inerte por padrão: sem a env CRON_SECRET configurada,
 * a rota não executa nada. Quando o cron do Vercel chama, ele manda Authorization: Bearer
 * <CRON_SECRET>; aceitamos também o header x-cron-secret para disparo manual controlado.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, reason: 'disabled' });
  }
  const auth = req.headers.get('authorization');
  const alt = req.headers.get('x-cron-secret');
  if (auth !== `Bearer ${secret}` && alt !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const summary = await runDunning(db());
  return NextResponse.json({ ok: true, ...summary });
}
