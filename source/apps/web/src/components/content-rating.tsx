'use client';

import { useState } from 'react';

/**
 * Avaliação por estrelas (1-5) de um conteúdo gerado pela IA. A nota treina a IA por contexto:
 * vira referência do próprio professor e, em nota alta, do acervo global. Comentário é opcional.
 */
export function ContentRating({ contentId, initial = 0 }: { contentId: string; initial?: number }) {
  const [rating, setRating] = useState(initial);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(initial > 0);
  const [busy, setBusy] = useState(false);

  async function send(value: number, withComment = false) {
    setBusy(true);
    try {
      const r = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contentId, rating: value, comment: withComment ? comment : undefined }),
      });
      if (r.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
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
              void send(v);
            }}
            aria-label={`${v} estrela${v > 1 ? 's' : ''}`}
            className="text-2xl leading-none transition-transform hover:scale-110 disabled:opacity-60"
          >
            <span className={(hover || rating) >= v ? 'text-amber-400' : 'text-muted-foreground/40'}>
              ★
            </span>
          </button>
        ))}
        {saved && (
          <span className="ml-2 text-xs text-muted-foreground">
            Valeu! Sua nota ajuda a IA a melhorar.
          </span>
        )}
      </div>
      {rating > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="O que faltou ou o que gostou? (opcional, ajuda a treinar)"
            maxLength={500}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void send(rating, true)}
            className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent disabled:opacity-60"
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}
