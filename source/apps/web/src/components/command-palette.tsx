'use client';

import type { LucideIcon } from 'lucide-react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type PaletteItem = { label: string; href: string; icon: LucideIcon; locked?: boolean };
type PaletteGroup = { label: string; items: PaletteItem[] };

/**
 * Busca rápida / command palette (Cmd+K). Reaproveita os grupos do menu (navFor) como fonte de
 * páginas, com navegação 100% por teclado. Abre por Cmd+K / Ctrl+K ou pelo evento
 * "eduon:command" (disparado pelo botão "Buscar" do cabeçalho).
 */
export function CommandPalette({ groups }: { groups: PaletteGroup[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(
    () =>
      groups.flatMap((g) =>
        g.items.map((i) => ({ ...i, group: g.label }) as PaletteItem & { group: string }),
      ),
    [groups],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(s) || i.group.toLowerCase().includes(s),
    );
  }, [items, q]);

  // Atalho global + abertura pelo botão do cabeçalho.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('eduon:command', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('eduon:command', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => selRef.current?.scrollIntoView({ block: 'nearest' }), [sel]);

  function go(item: PaletteItem) {
    setOpen(false);
    router.push(item.locked ? '/app/planos' : item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = filtered[sel];
      if (it) go(it);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm print:hidden"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar página, módulo ou ação..."
            className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              Nada encontrado para “{q}”.
            </p>
          ) : (
            filtered.map((it, idx) => {
              const Icon = it.icon;
              const active = idx === sel;
              return (
                <button
                  key={it.href}
                  ref={active ? selRef : undefined}
                  type="button"
                  onMouseEnter={() => setSel(idx)}
                  onClick={() => go(it)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    active ? 'bg-primary/12 text-foreground' : 'text-foreground/80 hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {(it as PaletteItem & { group: string }).group}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navegar · ↵ abrir · esc fechar</span>
          <span>
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}
