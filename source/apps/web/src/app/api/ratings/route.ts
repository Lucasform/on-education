import { getActivity, rateContent } from '@on-education/module-pedagogico';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Salva a nota (1-5) de um conteúdo gerado. Deriva tipo/matéria/faixa e o snapshot do próprio conteúdo. */
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    contentId?: string;
    rating?: number;
    comment?: string;
  };
  const contentId = String(body.contentId ?? '');
  const rating = Number(body.rating ?? 0);
  if (!contentId || !(rating >= 1 && rating <= 5)) {
    return new Response('Dados inválidos.', { status: 400 });
  }
  const act = await getActivity(db(), ctx, contentId).catch(() => null);
  if (!act) return new Response('Conteúdo não encontrado.', { status: 404 });

  await rateContent(db(), ctx, {
    kind: act.kind,
    contentId,
    rating,
    comment: body.comment ?? null,
    subject: act.subject ?? null,
    gradeLevel: act.gradeLevel ?? null,
    ageBand: act.ageBand ?? null,
    snapshot: act.content ?? null,
  });
  return Response.json({ ok: true });
}
