'use client';

import type { TenantType } from '@on-education/core';
import { GraduationCap, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { navFor } from '@/lib/nav';

import { ThemeToggle } from './theme-toggle';

/**
 * Casca do app com sidebar de funcionalidades (padrão On Condomínio): grupos + itens, cada
 * um com sua rota. Destaca o item ativo (usePathname) e tem drawer no mobile.
 */
export function AppShell({
  tenantType,
  subtitle,
  headerActions,
  children,
}: {
  tenantType: TenantType;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = navFor(tenantType);

  return (
    <div className="min-h-screen md:pl-64">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="font-semibold">On Way Education</span>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="ml-auto md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex h-[calc(100vh-3.5rem)] flex-col gap-5 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.label}
              </p>
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                          active
                            ? 'bg-primary/15 font-medium text-foreground'
                            : 'text-foreground/75 hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="truncate">{item.label}</span>
                        {item.soon && (
                          <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            em breve
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">{subtitle}</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {headerActions}
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-8">{children}</main>
    </div>
  );
}
