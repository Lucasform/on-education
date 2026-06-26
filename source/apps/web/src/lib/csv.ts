/**
 * Parser de CSV mínimo e robusto para importação por planilha (sem dependências).
 * Suporta delimitador `,` ou `;` (auto-detectado), campos entre aspas com `""` escapado,
 * e quebras de linha CRLF/LF. O Excel exporta "CSV (separado por vírgulas)" neste formato;
 * no Brasil o Excel costuma usar `;` por isso a auto-detecção.
 *
 * Funções auxiliares de coerção pt-BR (coerceNumber, coerceBoolean, coerceDate)
 * convertem valores brutos das células para os tipos corretos sem lançar exceção.
 */
export function parseCsv(text: string): string[][] {
  // remove BOM do Excel (0xFEFF no início), sem literal irregular no código
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const delimiter = detectDelimiter(clean);
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // ignora; o \n seguinte fecha a linha
    } else {
      field += c;
    }
  }
  // última célula/linha (se o arquivo não terminar em quebra de linha)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((cell) => cell.trim())).filter((r) => r.some((cell) => cell !== ''));
}

function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
  return firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
}

/**
 * Converte o CSV em registros pelo cabeçalho. A primeira linha são os nomes das colunas
 * (normalizados em minúsculas e sem acento) e cada linha vira um objeto coluna→valor.
 */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0]!.map(normalizeHeader);
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? '').trim()));
    return obj;
  });
}

function normalizeHeader(h: string): string {
  return h.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Pega o primeiro valor não vazio entre vários nomes de coluna possíveis (sinônimos). */
export function pick(rec: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = rec[normalizeHeader(k)];
    if (v) return v;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Coerção tolerante pt-BR
// ---------------------------------------------------------------------------

/**
 * Converte uma célula bruta em número, aceitando formatos pt-BR.
 * Exemplos aceitos: "1.234,56" → 1234.56 | "1234,56" → 1234.56 | "1234.56" → 1234.56
 * Retorna `undefined` se o valor for vazio ou não reconhecido.
 */
export function coerceNumber(raw: string): number | undefined {
  const s = raw.replace(/\s/g, '').replace(/^["']|["']$/g, '');
  if (s === '') return undefined;

  // Formato pt-BR com separador de milhar ponto e decimal vírgula: 1.234,56
  const ptBr = s.match(/^-?\d{1,3}(?:\.\d{3})*,\d*$/);
  if (ptBr) {
    const normalized = s.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : undefined;
  }

  // Apenas decimal com vírgula (sem separador de milhar): 1234,56
  const commaDecimal = s.match(/^-?\d+,\d*$/);
  if (commaDecimal) {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }

  // Formato padrão (ponto decimal ou inteiro): 1234.56, 1234
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Converte uma célula bruta em booleano pt-BR tolerante.
 * true: "sim", "s", "x", "1", "true", "verdadeiro" (insensível a maiúsculas/acentos)
 * false: "nao", "não", "n", "0", "false", "falso", ""
 * Retorna `undefined` se o valor não for reconhecido.
 */
export function coerceBoolean(raw: string): boolean | undefined {
  const s = raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  const trueValues = new Set(['sim', 's', 'x', '1', 'true', 'verdadeiro', 'yes', 'y']);
  const falseValues = new Set(['nao', 'n', '0', 'false', 'falso', 'no', '']);

  if (trueValues.has(s)) return true;
  if (falseValues.has(s)) return false;
  return undefined;
}

/**
 * Converte "DD/MM/AAAA" ou "AAAA-MM-DD" para ISO "AAAA-MM-DD".
 * Retorna `undefined` se vazio ou formato não reconhecido.
 */
export function coerceDate(raw: string): string | undefined {
  const s = raw.trim().replace(/^["']|["']$/g, '');
  if (s === '') return undefined;

  // Já no formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Formato BR: DD/MM/AAAA (dia e mês com 1 ou 2 dígitos)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const day = m[1]!.padStart(2, '0');
    const month = m[2]!.padStart(2, '0');
    const year = m[3]!;
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

/**
 * Remove espaços em branco extras, BOM residual e aspas envolventes de uma célula.
 * Útil para normalizar strings antes de validação.
 */
export function trimCell(raw: string): string {
  // Remove BOM do Excel (0xFEFF) sem literal irregular no código, depois aspas envolventes.
  const s = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return s.trim().replace(/^["']|["']$/g, '').trim();
}
