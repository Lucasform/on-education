'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { SubmitButton } from '@/components/submit-button';

import { applyComboPlanAction } from './actions';

export interface ComboCard {
  id: string;
  name: string;
  monthlyPrice: number;
  labels: string[];
  hasPrice: boolean;
  popular: boolean;
}

function preco(p: number): { valor: string; sufixo: string } {
  if (p === 0) return { valor: 'Grátis', sufixo: '' };
  if (p < 0) return { valor: 'Sob consulta', sufixo: '' };
  return { valor: `R$ ${p}`, sufixo: '/mês' };
}

export function ComboCards({
  combos,
  currentPlanId,
}: {
  combos: ComboCard[];
  currentPlanId: string | null;
}) {
  // Seleção inicial: o popular, se não for o plano atual; senão nenhum.
  const initial =
    combos.find((c) => c.popular && c.id !== currentPlanId)?.id ??
    combos.find((c) => c.id !== currentPlanId)?.id ??
    null;
  const [selected, setSelected] = useState<string | null>(initial);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {combos.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const isSelected = !isCurrent && selected === plan.id;
        const { valor, sufixo } = preco(plan.monthlyPrice);
        const cta = isCurrent
          ? 'Plano atual'
          : plan.monthlyPrice === 0
            ? 'Começar grátis'
            : plan.hasPrice
              ? 'Assinar'
              : 'Ativar';

        // Card: atual = travado (ring, sem clique); selecionado = aceso; demais = neutro.
        const cardCls = isCurrent
          ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/30 cursor-default'
          : isSelected
            ? 'border-primary bg-primary/[0.06] shadow-lg shadow-primary/15 ring-2 ring-primary/40 lg:-translate-y-1 cursor-pointer'
            : 'border-border bg-card hover:border-primary/40 hover:shadow-md cursor-pointer';

        return (
          <div
            key={plan.id}
            role={isCurrent ? undefined : 'button'}
            tabIndex={isCurrent ? undefined : 0}
            aria-pressed={isSelected}
            onClick={() => {
              if (!isCurrent) setSelected(plan.id);
            }}
            onKeyDown={(e) => {
              if (!isCurrent && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setSelected(plan.id);
              }
            }}
            className={`relative flex flex-col rounded-2xl border p-6 outline-none transition-all duration-200 ${cardCls}`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground shadow">
                ⭐ Mais popular
              </span>
            )}
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {isCurrent && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Atual
                </span>
              )}
            </div>
            <div className="mb-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">{valor}</span>
              {sufixo && <span className="text-sm text-muted-foreground">{sufixo}</span>}
            </div>
            <ul className="mb-6 flex-1 space-y-2 text-sm">
              {plan.labels.map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <form action={applyComboPlanAction} onClick={(e) => e.stopPropagation()}>
              <input type="hidden" name="planId" value={plan.id} />
              <SubmitButton
                type="submit"
                size="sm"
                variant={isCurrent ? 'outline' : isSelected ? 'default' : 'outline'}
                disabled={isCurrent}
                className="w-full rounded-full"
              >
                {cta}
              </SubmitButton>
            </form>
            {plan.hasPrice && !isCurrent && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                7 dias grátis · cancele quando quiser
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
