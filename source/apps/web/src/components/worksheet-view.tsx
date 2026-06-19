'use client';

import { Fragment } from 'react';

import { MarkdownView } from './markdown-view';

/**
 * Renderiza a folha de atividade: markdown normal + os marcadores [tracejar: A a], que viram
 * letras GRANDES e VAZADAS (contorno) pra criança cobrir — no padrão "cubra a letra". As letras
 * vazadas usam text-stroke (funciona na tela e na impressão).
 */
const TRACE_RE = /\[tracejar:\s*([^\]]+)\]/gi;

export function WorksheetView({ children }: { children: string }) {
  const nodes: { key: number; md?: string; trace?: string }[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  TRACE_RE.lastIndex = 0;
  while ((m = TRACE_RE.exec(children)) !== null) {
    if (m.index > last) nodes.push({ key: i++, md: children.slice(last, m.index) });
    nodes.push({ key: i++, trace: m[1]!.trim() });
    last = m.index + m[0].length;
  }
  if (last < children.length) nodes.push({ key: i++, md: children.slice(last) });

  return (
    <>
      {nodes.map((n) =>
        n.trace !== undefined ? (
          <TraceLine key={n.key} text={n.trace} />
        ) : (
          <Fragment key={n.key}>
            <MarkdownView>{n.md ?? ''}</MarkdownView>
          </Fragment>
        ),
      )}
    </>
  );
}

/** Linha de cobrir: a sequência repetida 3x em letras vazadas grandes. */
function TraceLine({ text }: { text: string }) {
  return (
    <div className="my-4 flex flex-wrap items-center gap-x-10 gap-y-4">
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
