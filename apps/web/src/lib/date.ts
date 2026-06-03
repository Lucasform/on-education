/** Data de hoje no fuso de São Paulo, no formato YYYY-MM-DD (para inputs `type=date`). */
export function hojeISO(): string {
  // en-CA formata como YYYY-MM-DD; o timeZone garante a data correta no Brasil.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export type Periodo = 'semana' | 'mes' | 'tudo';

/**
 * Data inicial (YYYY-MM-DD) do período escolhido para filtrar diário/chamada (item 9).
 * "semana" = últimos 7 dias, "mes" = últimos 30 dias, "tudo" = sem corte (string vazia).
 */
export function inicioPeriodo(periodo: Periodo): string {
  if (periodo === 'tudo') return '';
  const dias = periodo === 'semana' ? 7 : 30;
  const hoje = new Date(`${hojeISO()}T00:00:00`);
  hoje.setDate(hoje.getDate() - (dias - 1));
  return hoje.toLocaleDateString('en-CA');
}
