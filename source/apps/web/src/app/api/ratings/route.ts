import { getActivity, rateContent } from '@on-education/module-pedagogico';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Salva a nota (1-5) de um conteúdo gerado. Deriva tipo/matéria/faixa e o snapshot do próprio conteúdo. */
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    contentId?: string;
    rating?: number;
    comment?: string;
    snapshot?: string;
    subject?: string;
    ageBand?: string;
  };
  const contentId = String(body.contentId ?? '');
  const rating = Number(body.rating ?? 0);
  if (!contentId || !(rating >= 1 && rating <= 5)) {
    return new Response('Dados inválidos.', { status: 400 });
  }

  let kind = body.kind ? String(body.kind) : '';
  let snapshot = body.snapshot ? String(body.snapshot) : null;
  let subject = body.subject ?? null;
  let gradeLevel: string | null = null;
  let ageBand = body.ageBand ?? null;

  // Sem snapshot do cliente: tenta resolver como atividade (deriva tipo/matéria/faixa/conteúdo).
  if (!snapshot) {
    const act = await getActivity(db(), ctx, contentId).catch(() => null);
    if (act) {
      kind = act.kind;
      snapshot = act.content ?? null;
      subject = act.subject ?? null;
      gradeLevel = act.gradeLevel ?? null;
      ageBand = act.ageBand ?? null;
    }
  }
  if (!kind) kind = 'conteudo';

  await rateContent(db(), ctx, {
    kind,
    contentId,
    rating,
    comment: body.comment ?? null,
    subject,
    gradeLevel,
    ageBand,
    snapshot,
  });
  return Response.json({ ok: true });
}
