'use client';

import { Button } from '@on-education/ui';
import { Check } from 'lucide-react';
import { useState } from 'react';

const PLANOS = [
  {
    nome: 'Professor',
    preco: 'R$ 19',
    periodo: '/mês',
    nota: '14 dias grátis para testar',
    resumo: 'Para o professor autônomo organizar suas turmas.',
    recursos: [
      'Turmas e alunos',
      'EduON pedagógico (cota mensal)',
      'Banco de atividades e portfólio',
      'Diário, chamada e boletim',
    ],
    cta: 'Testar grátis',
    href: '/signup',
    badge: '',
  },
  {
    nome: 'Professor Pro',
    preco: 'R$ 39',
    periodo: '/mês',
    nota: '14 dias grátis para testar',
    resumo: 'Para quem quer o EduON sem limites e mais produtividade.',
    recursos: [
      'Tudo do plano Professor',
      'EduON sem limites',
      'Simulados com correção automática',
      'Comunicados e calendário',
      'Sem marca On Way Education',
    ],
    cta: 'Assinar o Pro',
    href: '/signup',
    badge: 'Mais popular',
  },
  {
    nome: 'Escola',
    preco: 'Sob consulta',
    periodo: '',
    nota: 'Plano institucional',
    resumo: 'Para colégios, com gestão e vários perfis de acesso.',
    recursos: [
      'Diretor, coordenação e professores',
      'Unidades, ano letivo e disciplinas',
      'Relatórios de direção',
      'Responsáveis e comunicação',
      'Onboarding e suporte',
    ],
    cta: 'Falar com a gente',
    href: '/signup/escola',
    badge: '',
  },
];

export function PricingCards() {
  // Pro vem pré-selecionado; clicar em outro card muda a seleção (e a cor).
  const [sel, setSel] = useState(1);

  return (
    <>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANOS.map((p, i) => {
          const ativo = i === sel;
          return (
            <div
              key={p.nome}
              role="button"
              tabIndex={0}
              aria-pressed={ativo}
              onClick={() => setSel(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSel(i);
                }
              }}
              className={`relative flex cursor-pointer flex-col rounded-2xl border p-6 text-left outline-none transition-all duration-200 ${
                ativo
                  ? 'border-primary bg-primary/5 shadow-xl shadow-primary/15 ring-2 ring-primary lg:-translate-y-1'
                  : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-3 py-0.5 text-xs font-medium text-white">
                  {p.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.nome}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.resumo}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.preco}</span>
                {p.periodo && <span className="text-sm text-muted-foreground">{p.periodo}</span>}
              </div>
              <p className="mt-1 text-xs text-primary">{p.nota}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {p.recursos.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <a href={p.href} className="mt-6" onClick={(e) => e.stopPropagation()}>
                <Button className="w-full rounded-full" variant={ativo ? 'default' : 'outline'}>
                  {p.cta}
                </Button>
              </a>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Valores ilustrativos para validação. Sem fidelidade, cancele quando quiser.
      </p>
    </>
  );
}
