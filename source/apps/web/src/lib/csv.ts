/**
 * Parser de CSV mínimo e robusto para importação por planilha (sem dependências).
 * Suporta delimitador `,` ou `;` (auto-detectado), campos entre aspas com `""` escapado,
 * e quebras de linha CRLF/LF. O Excel exporta "CSV (separado por vírgulas)" neste formato;
 * no Brasil o Excel costuma usar `;` — por isso a auto-detecção.
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
