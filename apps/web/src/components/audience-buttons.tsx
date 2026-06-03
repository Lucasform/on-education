'use client';

import { useState } from 'react';

/**
 * Botões de público da CTA final ("Sou professor autônomo" / "Tenho uma escola").
 * Mesma cor para os dois; ao clicar, o escolhido fica "selecionado" (igual aos cards de
 * plano) e então navega para o cadastro correspondente.
 */
const OPCOES = [
  { label: 'Sou professor autônomo', href: '/signup' },
  { label: 'Tenho uma escola', href: '/signup/escola' },
];

export function AudienceButtons() {
  const [sel, setSel] = useState<number | null>(null);

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
            className={`rounded-full border px-7 py-3 text-sm font-medium transition-all duration-150 ${
              ativo
                ? 'border-white bg-white text-primary ring-2 ring-white'
                : 'border-white/40 bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {o.label}
          </a>
        );
      })}
    </div>
  );
}
