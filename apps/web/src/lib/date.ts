/** Data de hoje no fuso de São Paulo, no formato YYYY-MM-DD (para inputs `type=date`). */
export function hojeISO(): string {
  // en-CA formata como YYYY-MM-DD; o timeZone garante a data correta no Brasil.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
