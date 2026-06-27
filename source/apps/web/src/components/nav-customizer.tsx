'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { navFor } from '@/lib/nav';

const KEY = 'eow_nav_hidden';
const EVT = 'eow-nav-hidden';

type Groups = ReturnType<typeof navFor>;

/** Preferência (salva no aparelho): itens do menu que o usuário escolheu esconder. */
export function useHiddenNav(): Set<string> {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        setHidden(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      } catch {
        setHidden(new Set());
      }
    };
    read();
    window.addEventListener(EVT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(EVT, read);
      window.removeEventListener('storage', read);
    };
  }, []);
  return hidden;
}

function toggleHidden(href: string) {
  let arr: string[] = [];
  try {
    arr = JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
  } catch {
    arr = [];
  }
  const set = new Set(arr);
  if (set.has(href)) set.delete(href);
  else set.add(href);
  localStorage.setItem(KEY, JSON.stringify([...set]));
  window.dispatchEvent(new Event(EVT));
}

/**
 * Painel "Personalizar menu": o usuário marca o que usa e o resto some do sidebar. A preferência
 * fica no aparelho (localStorage), sem custo de banco. O "Início" nunca pode ser escondido.
 */
export function NavCustomizer({ groups, className = '' }: { groups: Groups; className?: string }) {
  const [open, setOpen] = useState(false);
  const hidden = useHiddenNav();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground ${className}`}
      >
        <SlidersHorizontal className="h-3 w-3" />
        Personalizar menu
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Personalizar menu</h2>
                <p className="text-xs text-muted-foreground">
                  Marque o que você usa. O resto some do menu (vale só pra você).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {groups.map((g) => {
                const items = g.items.filter((i) => i.href !== '/app');
                if (items.length === 0) return null;
                return (
                  <div key={g.label}>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {g.label}
                    </p>
                    <ul className="space-y-0.5">
                      {items.map((i) => (
                        <li key={i.href}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                            <input
                              type="checkbox"
                              checked={!hidden.has(i.href)}
                              onChange={() => toggleHidden(i.href)}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span>{i.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
