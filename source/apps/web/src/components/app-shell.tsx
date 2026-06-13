'use client';

import type { TenantType } from '@on-education/core';
import { Lock, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { navFor } from '@/lib/nav';

import { AppGrid } from './app-grid';
import { BottomNav } from './bottom-nav';
import { LogoMark } from './logo-mark';
import { ThemeToggle } from './theme-toggle';

/**
 * Casca do app com sidebar de funcionalidades (padrão On Condomínio): grupos + itens, cada
 * um com sua rota. Destaca o item ativo (usePathname) e tem drawer no mobile.
 */
export function AppShell({
  tenantType,
  planId,
  subtitle,
  headerActions,
  logoUrl,
  workspaceName,
  badges,
  children,
}: {
  tenantType: TenantType;
  /** Plano ativo do tenant — usado para marcar itens travados no menu. */
  planId?: string | null;
  subtitle?: string;
  headerActions?: ReactNode;
  logoUrl?: string | null;
  workspaceName?: string | null;
  /** Contadores por rota (href → número) exibidos como badge no item do menu. */
  badges?: Record<string, number>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = navFor(tenantType, planId);
  const upgradeBadge = tenantType === 'individual' ? 'Pro' : 'Full';

  return (
    <div className="min-h-screen md:pl-64 print:pl-0">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card md:block print:hidden">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo da escola" className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <LogoMark size={28} />
          )}
          <span className="font-semibold">Edu On Way</span>
          {workspaceName && (
            <span className="truncate text-sm text-muted-foreground" title={workspaceName}>
              · {workspaceName}
            </span>
          )}
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
              {!g.hideLabel && (
                <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </p>
              )}
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
                          item.locked
                            ? 'text-muted-foreground/50 hover:bg-accent hover:text-muted-foreground'
                            : active
                              ? 'bg-primary/15 font-medium text-foreground'
                              : 'text-foreground/75 hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="truncate">{item.label}</span>
                        {item.locked ? (
                          <span className="ml-auto flex items-center gap-0.5 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            <Lock className="h-2.5 w-2.5" />
                            {upgradeBadge}
                          </span>
                        ) : badges?.[item.href] ? (
                          <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                            {badges[item.href]}
                          </span>
                        ) : item.soon ? (
                          <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            em breve
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Launcher em tela cheia no mobile (sem sidebar): ícones grandes, escolha e abra. */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background md:hidden print:hidden">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <LogoMark size={28} />
            )}
            <span className="font-semibold">{workspaceName ?? 'Edu On Way'}</span>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
              className="ml-auto"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            <AppGrid groups={groups} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8 print:hidden">
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

      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-20 md:p-8 md:pb-8 print:max-w-none print:p-0">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
