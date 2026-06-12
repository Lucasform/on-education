'use client';

import { useState } from 'react';

/**
 * Botões de público ("Sou professor autônomo" / "Tenho uma escola"). Mesma cor para os dois;
 * ao clicar, o escolhido fica "selecionado" (igual aos cards de plano) e então navega.
 * - variant "light": para fundos escuros/gradiente (CTA final).
 * - variant "surface": adaptado ao tema (hero, sobre o fundo da página).
 */
const OPCOES = [
  { label: 'Sou professor autônomo', href: '/signup' },
  { label: 'Tenho uma escola', href: '/signup/escola' },
];

export function AudienceButtons({ variant = 'light' }: { variant?: 'light' | 'surface' }) {
  const [sel, setSel] = useState<number | null>(null);

  const base =
    variant === 'light'
      ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
      : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent';
  const ativoCls =
    variant === 'light'
      ? 'border-white bg-white text-primary ring-2 ring-white'
      : 'border-primary bg-primary text-primary-foreground ring-2 ring-primary';

  return (
    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
      {OPCOES.map((o, i) => {
        const ativo = i === sel;
        return (
          <a
            key={o.href}
            href={o.href}
            onClick={() => setSel(i)}
            aria-pressed={ativo}
            className={`rounded-full border px-7 py-3 text-center text-sm font-medium transition-all duration-150 ${
              ativo ? ativoCls : base
            }`}
          >
            {o.label}
          </a>
        );
      })}
    </div>
  );
}
