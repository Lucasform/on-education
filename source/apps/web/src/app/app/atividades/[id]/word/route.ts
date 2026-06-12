import { getActivity } from '@on-education/module-pedagogico';
import { marked } from 'marked';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Baixa a atividade como .doc (HTML do Word) — preserva títulos, negrito e tabelas. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });

  const atividade = await getActivity(db(), ctx, id).catch(() => null);
  if (!atividade) return new Response('Atividade não encontrada.', { status: 404 });

  const corpo = await marked.parse(atividade.content, { gfm: true });
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${atividade.title}</title>` +
    '<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;}' +
    'table{border-collapse:collapse;}td,th{border:1px solid #999;padding:4px 8px;}' +
    'h1,h2,h3{font-family:Calibri,Arial,sans-serif;}</style></head><body>' +
    `<h1>${atividade.title}</h1>${corpo}</body></html>`;

  const safe = (atividade.title || 'atividade')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .slice(0, 80)
    .trim();
  return new Response(html, {
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safe || 'atividade'}.doc"`,
    },
  });
}
