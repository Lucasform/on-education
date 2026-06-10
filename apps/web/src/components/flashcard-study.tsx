'use client';

import { useState } from 'react';

import { cardClass } from '@/components/form';

/** Estudo de flashcards: mostra um card por vez, clica para virar, navega entre eles. */
export function FlashcardStudy({
  cards,
}: {
  cards: { front: string; back: string; image?: string }[];
}) {
  const [i, setI] = useState(0);
  const [virado, setVirado] = useState(false);

  if (cards.length === 0) return <p className="text-sm text-muted-foreground">Baralho vazio.</p>;
  const card = cards[Math.min(i, cards.length - 1)]!;

  function ir(delta: number) {
    setVirado(false);
    setI((v) => (v + delta + cards.length) % cards.length);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => setVirado((v) => !v)}
        className={`${cardClass} flex min-h-48 w-full max-w-xl items-center justify-center p-8 text-center text-lg transition-colors hover:border-primary/40`}
      >
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
            {virado ? 'Verso' : 'Frente'}
          </div>
          {!virado && card.image && (
            // figura do card (para a criança ver)
            <img
              src={card.image}
              alt={card.front}
              loading="lazy"
              className="mx-auto mb-3 h-40 w-40 rounded-lg object-cover"
            />
          )}
          <div className="whitespace-pre-wrap">{virado ? card.back : card.front}</div>
          {!virado && (
            <div className="mt-3 text-xs text-muted-foreground">clique para ver a resposta</div>
          )}
        </div>
      </button>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => ir(-1)}
          className="rounded-md border border-border px-3 py-1.5 text-sm"
        >
          ← Anterior
        </button>
        <span className="text-sm text-muted-foreground">
          {i + 1} / {cards.length}
        </span>
        <button
          type="button"
          onClick={() => ir(1)}
          className="rounded-md border border-border px-3 py-1.5 text-sm"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
