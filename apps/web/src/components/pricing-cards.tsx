'use client';

import { Button } from '@on-education/ui';
import { Check } from 'lucide-react';
import { useState } from 'react';

type Plano = {
  nome: string;
  resumo: string;
  nota: string;
  preco: string;
  periodo?: string;
  recursos: string[];
  cta: string;
  href: string;
  badge: string;
};

// Preço mensal travado nesta fase inicial (sem ciclo anual). Escola é sob consulta.
const PLANOS: Plano[] = [
  {
    nome: 'Professor',
    preco: 'R$ 39',
    periodo: '/mês',
    nota: '7 dias grátis para testar',
    resumo: 'Para o professor autônomo organizar suas turmas com IA.',
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
    preco: 'R$ 79',
    periodo: '/mês',
    nota: '7 dias grátis para testar',
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
    preco: 'Consultar preço',
    nota: 'Plano sob medida para a sua escola',
    resumo: 'Para colégios, com gestão completa e vários perfis de acesso.',
    recursos: [
      'Diretor, coordenação, secretaria e professores',
      'Turmas, disciplinas, diário e boletim',
      'Relatórios de direção e ocorrências',
      'Responsáveis e comunicação',
      'Onboarding e suporte dedicado',
    ],
    cta: 'Falar com a gente',
    href: '/signup/escola',
    badge: '',
  },
];

export function PricingCards() {
  // Pro pré-selecionado; clicar muda a cor.
  const [sel, setSel] = useState(1);

  return (
    <>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
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
        Professor com 7 dias grátis. Escola sob consulta. Sem fidelidade, cancele quando quiser.
      </p>
    </>
  );
}
