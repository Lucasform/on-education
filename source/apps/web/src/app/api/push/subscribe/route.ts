import { db } from '@/server/db';
import { savePushSubscription } from '@/server/push';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });
  const body = await req.json().catch(() => null);
  const sub = body?.subscription ?? body;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return new Response('Inscrição inválida.', { status: 400 });
  }
  await savePushSubscription(db(), ctx, sub, req.headers.get('user-agent') ?? undefined);
  return Response.json({ ok: true });
}
