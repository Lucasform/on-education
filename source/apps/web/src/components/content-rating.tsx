'use client';

import { useState } from 'react';

/**
 * Avaliação por estrelas (1-5) de um conteúdo gerado pela IA. A nota treina a IA por contexto.
 * Fluxo: escolhe estrelas -> comenta (opcional) -> envia -> agradece e RECOLHE, com a opção
 * de reavaliar (segunda análise) sem ficar aberto.
 */
export function ContentRating({
  contentId,
  kind,
  snapshot,
  ageBand,
  initial = 0,
}: {
  contentId: string;
  kind?: string;
  snapshot?: string;
  ageBand?: string | null;
  initial?: number;
}) {
  const [rating, setRating] = useState(initial);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(initial > 0); // recolhido após avaliar

  async function send(value: number, withComment = false) {
    setBusy(true);
    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contentId,
          kind,
          snapshot,
          ageBand,
          rating: value,
          comment: withComment ? comment : undefined,
        }),
      });
    } finally {
      setBusy(false);
    }
  }

  // Recolhido: agradece e oferece reavaliar.
  if (done) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-amber-400">{'★'.repeat(rating)}</span>
        <span className="text-xs text-muted-foreground">Obrigado pela nota!</span>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          Reavaliar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            disabled={busy}
            onMouseEnter={() => setHover(v)}
            onMouseLeave={() => setHover(0)}
            onClick={() => {
              setRating(v);
              void send(v); // salva a nota na hora; o comentário é opcional
            }}
            aria-label={`${v} estrela${v > 1 ? 's' : ''}`}
            className="text-2xl leading-none transition-transform hover:scale-110 disabled:opacity-60"
          >
            <span className={(hover || rating) >= v ? 'text-amber-400' : 'text-muted-foreground/40'}>
              ★
            </span>
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="O que faltou ou o que gostou? (opcional)"
            maxLength={500}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              await send(rating, true);
              setDone(true);
            }}
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Enviar
          </button>
          <button
            type="button"
            onClick={() => setDone(true)}
            className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent"
          >
            Pular
          </button>
        </div>
      )}
    </div>
  );
}
