import { getTenantSettings } from '@on-education/module-nucleo';
import { getActivity } from '@on-education/module-pedagogico';
import { marked } from 'marked';

import { db } from '@/server/db';
import { escapeHtml } from '@/server/email';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/**
 * Baixa a atividade como .doc (HTML do Word): folha A4 (sulfite) com margens, cabeçalho do
 * aluno (Nome/Turma/Data) e logo da escola. Marcadores viram conteúdo imprimível:
 *  - [tracejar: X] → letras em cinza-claro para a criança cobrir;
 *  - [figura: ...] → caixa pontilhada para colar/desenhar a figura (quando não houver imagem).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });

  const [atividade, settings] = await Promise.all([
    getActivity(db(), ctx, id).catch(() => null),
    getTenantSettings(db(), ctx).catch(() => null),
  ]);
  if (!atividade) return new Response('Atividade não encontrada.', { status: 404 });

  const processado = atividade.content
    .replace(
      /\[tracejar:\s*([^\]]+)\]/gi,
      (_m, s: string) =>
        `\n\n<p style="font-size:24pt;letter-spacing:10px;color:#c9c9c9;font-family:Arial;">${escapeHtml(
          s.trim(),
        )}</p>\n\n`,
    )
    .replace(
      /\[figura:\s*([^\]]+)\]/gi,
      (_m, s: string) =>
        `\n\n<table style="width:100%;margin:6pt 0"><tr><td style="border:1px dashed #9aa4b2;height:120pt;text-align:center;color:#9aa4b2;font-size:9pt;vertical-align:bottom;padding:4pt;">figura: ${escapeHtml(
          s.trim(),
        )}</td></tr></table>\n\n`,
    );
  const corpo = await marked.parse(processado, { gfm: true });

  const logo = settings?.logoUrl
    ? `<img src="${settings.logoUrl}" style="height:44px;width:44px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:10px;">`
    : '';
  const subtitulo = atividade.subject
    ? `<p style="margin:2pt 0 0;color:#555;font-size:10pt;">${escapeHtml(atividade.subject)}</p>`
    : '';
  const cabecalho =
    `<div style="border-bottom:1px solid #bbb;padding-bottom:8pt;margin-bottom:10pt;">` +
    `${logo}<span style="font-size:16pt;font-weight:bold;">${escapeHtml(atividade.title)}</span>${subtitulo}</div>` +
    `<table style="width:100%;margin-bottom:14pt;font-size:11pt;"><tr>` +
    `<td>Nome: _______________________________</td>` +
    `<td style="text-align:center;">Turma: ____________</td>` +
    `<td style="text-align:right;">Data: ____________</td>` +
    `</tr></table>`;

  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(atividade.title)}</title>` +
    '<style>@page{size:21cm 29.7cm;margin:16mm 14mm;}' +
    'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45;}' +
    'table{border-collapse:collapse;}td,th{padding:4px 8px;}' +
    'ol,ul{margin:0 0 8pt 18pt;}li{margin-bottom:6pt;}' +
    'h1,h2,h3{font-family:Calibri,Arial,sans-serif;margin:10pt 0 6pt;}</style></head><body>' +
    `${cabecalho}${corpo}</body></html>`;

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
