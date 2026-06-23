import { db } from '@/server/db';
import { sendPushToUser } from '@/server/push';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });
  const sent = await sendPushToUser(db(), ctx.tenantId, ctx.userId, {
    title: 'Edu On Way',
    body: 'Notificações ativadas! Você vai receber avisos por aqui. 🎉',
    url: '/app',
  });
  return Response.json({ ok: true, sent });
}
