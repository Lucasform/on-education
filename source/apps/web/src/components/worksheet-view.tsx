'use client';

import { ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renderiza a FOLHA de atividade com cara de material imprimível de verdade:
 * - markdown (títulos, listas, tabelas) com tipografia arejada e legível;
 * - imagens geradas (![alt](url)) emolduradas e centralizadas;
 * - marcador [tracejar: A a] vira letras GRANDES vazadas para a criança cobrir;
 * - marcador [figura: descrição] vira uma MOLDURA pontilhada (espaço para desenhar/colar),
 *   então nunca vaza como texto cru quando a imagem não foi gerada.
 */
const TOKEN_RE = /\[(tracejar|figura):\s*([^\]]+)\]/gi;

// Tipografia da folha: base maior que o prose-sm padrão, espaçamento generoso, imagens
// emolduradas e centralizadas, marcadores de lista na cor da marca.
const SHEET_PROSE =
  'prose prose-base max-w-none dark:prose-invert ' +
  'prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-6 prose-h3:text-lg ' +
  'prose-p:leading-relaxed prose-p:my-2.5 prose-li:my-1.5 prose-li:leading-relaxed marker:text-primary ' +
  'prose-strong:text-foreground prose-table:text-sm ' +
  'prose-img:mx-auto prose-img:my-4 prose-img:rounded-2xl prose-img:border prose-img:border-border ' +
  'prose-img:bg-white prose-img:p-2 prose-img:max-h-80 prose-img:shadow-sm';

export function WorksheetView({ children }: { children: string }) {
  const nodes: { key: number; md?: string; trace?: string; figura?: string }[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(children)) !== null) {
    if (m.index > last) nodes.push({ key: i++, md: children.slice(last, m.index) });
    const value = m[2]!.trim();
    if (m[1]!.toLowerCase() === 'tracejar') nodes.push({ key: i++, trace: value });
    else nodes.push({ key: i++, figura: value });
    last = m.index + m[0].length;
  }
  if (last < children.length) nodes.push({ key: i++, md: children.slice(last) });

  return (
    <div className="worksheet">
      {nodes.map((n) =>
        n.trace !== undefined ? (
          <TraceLine key={n.key} text={n.trace} />
        ) : n.figura !== undefined ? (
          <FigureBox key={n.key} desc={n.figura} />
        ) : (
          <div key={n.key} className={SHEET_PROSE}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.md ?? ''}</ReactMarkdown>
          </div>
        ),
      )}
    </div>
  );
}

/** Moldura para desenhar/colar a figura (quando a imagem não foi gerada). */
function FigureBox({ desc }: { desc: string }) {
  return (
    <figure className="my-4 flex break-inside-avoid flex-col items-center">
      <div className="flex h-40 w-full max-w-xs items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground">
        <ImageIcon className="h-8 w-8 opacity-50" />
      </div>
      <figcaption className="mt-1.5 text-center text-xs italic text-muted-foreground">{desc}</figcaption>
    </figure>
  );
}

/** Linha de cobrir: a sequência repetida em letras vazadas grandes (contorno). */
function TraceLine({ text }: { text: string }) {
  return (
    <div className="my-4 flex flex-wrap items-center gap-x-10 gap-y-4 break-inside-avoid">
      {[0, 1, 2].map((r) => (
        <span
          key={r}
          aria-hidden="true"
          style={{
            fontSize: '56px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: 'transparent',
            WebkitTextStroke: '1.6px #9aa0aa',
            lineHeight: 1.1,
            fontFamily: 'Verdana, Tahoma, sans-serif',
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}
