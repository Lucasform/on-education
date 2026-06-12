'use client';

import { Button } from '@on-education/ui';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

/** Menu sanduíche da landing no mobile (a nav some em telas pequenas). */
export function LandingMobileMenu({ items }: { items: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mx-4 mt-2 rounded-xl border border-border bg-card p-2 shadow-xl">
          <nav className="flex flex-col">
            {items.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
            <a href="/login" onClick={() => setOpen(false)} className="mt-1">
              <Button size="sm" className="w-full rounded-lg">
                Entrar
              </Button>
            </a>
          </nav>
        </div>
      )}
    </div>
  );
}
