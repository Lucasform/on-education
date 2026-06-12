import { getPublicTenantBrand } from '@on-education/module-nucleo';

import { db } from '@/server/db';
import { type CalDay, buildSchoolCalendar } from '@/server/school-calendar';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const COR: Record<CalDay['type'], string> = {
  letivo: '#ffffff',
  fim_de_semana: '#f1f2f4',
  feriado: '#fde2e1',
  recesso: '#fdecd6',
  evento: '#e3effd',
};

function cellHtml(d: CalDay): string {
  const bg = COR[d.type];
  const bold = d.type === 'feriado' || d.type === 'recesso' ? 'font-weight:bold;' : '';
  const titulo = d.title ? `<div style="font-size:7pt;color:#555">${esc(d.title.slice(0, 18))}</div>` : '';
  return `<td style="background:${bg};border:1px solid #ccc;height:42px;width:14%;vertical-align:top;padding:2px;${bold}">${d.day}${titulo}</td>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mesHtml(ano: number, mes: number, dias: CalDay[]): string {
  // Agrupa em semanas (Dom..Sáb), com pad inicial pelo dia da semana do 1º dia presente.
  const cells: string[] = [];
  const pad = dias[0]?.weekday ?? 0;
  for (let i = 0; i < pad; i++) cells.push('<td style="border:1px solid #eee"></td>');
  for (const d of dias) cells.push(cellHtml(d));
  while (cells.length % 7 !== 0) cells.push('<td style="border:1px solid #eee"></td>');

  let linhas = '';
  for (let i = 0; i < cells.length; i += 7) linhas += `<tr>${cells.slice(i, i + 7).join('')}</tr>`;

  return (
    `<h3 style="margin:14px 0 4px">${MESES[mes]} de ${ano}</h3>` +
    '<table style="border-collapse:collapse;width:100%;font-size:9pt;text-align:center">' +
    `<tr>${SEMANA.map((s) => `<th style="background:#34406b;color:#fff;border:1px solid #34406b;padding:3px">${s}</th>`).join('')}</tr>` +
    linhas +
    '</table>'
  );
}

/** Gera o calendário escolar anual em .doc (Word), com cada dia marcado e a contagem de letivos. */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });

  const cal = await buildSchoolCalendar(db(), ctx);
  if (!cal) {
    return new Response(
      'Configure o ano letivo com data de início e fim em Escola › Ano letivo e períodos.',
      { status: 400 },
    );
  }
  const brand = await getPublicTenantBrand(db(), ctx.tenantId).catch(() => null);
  const escola = brand?.name ?? 'Escola';

  const atinge = cal.faltam === 0;
  const resumo =
    `<p style="font-size:11pt"><b>Período:</b> ${cal.start.split('-').reverse().join('/')} a ${cal.end.split('-').reverse().join('/')}` +
    ` &nbsp;|&nbsp; <b>Dias letivos:</b> ${cal.letivos} / ${cal.required} ` +
    (atinge
      ? '<span style="color:#197a3d">✔ atinge o mínimo do MEC</span>'
      : `<span style="color:#b3261e">⚠ faltam ${cal.faltam} dias letivos</span>`) +
    ` &nbsp;|&nbsp; Feriados: ${cal.feriados} · Recessos: ${cal.recessos} · Eventos: ${cal.eventos}</p>`;

  const legenda =
    '<p style="font-size:9pt">Legenda: ' +
    `<span style="background:${COR.feriado};padding:1px 6px">Feriado</span> ` +
    `<span style="background:${COR.recesso};padding:1px 6px">Recesso</span> ` +
    `<span style="background:${COR.evento};padding:1px 6px">Evento</span> ` +
    `<span style="background:${COR.fim_de_semana};padding:1px 6px">Fim de semana</span> ` +
    '<span style="border:1px solid #ccc;padding:1px 6px">Dia letivo</span></p>';

  const corpo = cal.meses.map((m) => mesHtml(m.ano, m.mes, m.dias)).join('');

  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Calendário ${cal.yearName}</title></head>` +
    '<body style="font-family:Calibri,Arial,sans-serif;color:#1f2430">' +
    `<h1 style="margin:0">${esc(escola)}</h1>` +
    `<h2 style="margin:2px 0 8px">Calendário Escolar ${esc(cal.yearName)}</h2>` +
    resumo +
    legenda +
    corpo +
    '</body></html>';

  return new Response(html, {
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename="calendario-${cal.yearName}.doc"`,
    },
  });
}
