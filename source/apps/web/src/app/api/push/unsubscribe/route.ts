import { db } from '@/server/db';
import { deletePushSubscription } from '@/server/push';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await deletePushSubscription(db(), ctx, String(endpoint));
  return Response.json({ ok: true });
}
