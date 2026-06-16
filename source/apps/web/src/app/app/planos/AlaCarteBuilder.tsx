'use client';

import { useMemo, useState } from 'react';

import { SubmitButton } from '@/components/submit-button';

import { applyAlaCarteAction } from './actions';

interface Item {
  feature: string;
  label: string;
  description: string;
  category: string;
  price: number;
}

export function AlaCarteBuilder({
  items,
  min,
  initial,
}: {
  items: Item[];
  min: number;
  initial: string[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(initial));

  const toggle = (f: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const total = useMemo(
    () => items.filter((i) => sel.has(i.feature)).reduce((s, i) => s + i.price, 0),
    [items, sel],
  );
  const count = sel.size;
  const ok = count >= min;

  // Agrupa por categoria
  const byCat = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items) {
      const arr = m.get(i.category) ?? [];
      arr.push(i);
      m.set(i.category, arr);
    }
    return [...m.entries()];
  }, [items]);

  return (
    <form action={applyAlaCarteAction} className="space-y-4">
      {[...sel].map((f) => (
        <input key={f} type="hidden" name="features" value={f} />
      ))}

      <div className="space-y-4">
        {byCat.map(([cat, list]) => (
          <div key={cat}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cat}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((i) => {
                const on = sel.has(i.feature);
                return (
                  <button
                    type="button"
                    key={i.feature}
                    onClick={() => toggle(i.feature)}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                      on
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                            on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                          }`}
                        >
                          {on ? '✓' : ''}
                        </span>
                        {i.label}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-primary">
                        R$ {i.price}
                      </span>
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">{i.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Resumo fixo */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 p-4 backdrop-blur">
        <div>
          <p className="text-sm">
            <span className="font-semibold">{count}</span> selecionada(s) ·{' '}
            <span className={ok ? 'text-success' : 'text-danger'}>
              mínimo {min}
            </span>
          </p>
          <p className="text-2xl font-bold">
            R$ {total}
            <span className="text-sm font-normal text-muted-foreground">/mês</span>
          </p>
        </div>
        <SubmitButton type="submit" disabled={!ok} size="sm">
          {ok ? 'Ativar este pacote' : `Selecione +${min - count}`}
        </SubmitButton>
      </div>
    </form>
  );
}
