'use client';

import {
  AlertTriangle,
  Building2,
  Library,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Plug,
  Shield,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { ThemeToggle } from './theme-toggle';

const NAV = [
  { href: '/admin', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/contas', label: 'Contas', icon: Building2, exact: false },
  { href: '/admin/coletivo', label: 'Banco coletivo', icon: Library, exact: false },
  { href: '/admin/suporte', label: 'Suporte', icon: LifeBuoy, exact: false },
  { href: '/admin/erros', label: 'Erros', icon: AlertTriangle, exact: false },
  { href: '/admin/integracoes', label: 'Integrações', icon: Plug, exact: false },
];

/**
 * Casca do console de super-admin: sidebar (visão geral / contas) + header com o e-mail do
 * operador. Mesmo padrão visual do `AppShell`, mas sem tenant — é o painel do dono do produto.
 */
export function AdminShell({
  email,
  headerActions,
  children,
}: {
  email: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen md:pl-64">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </span>
          <span className="font-semibold">Admin</span>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="ml-auto md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 py-4">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
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
              </Link>
            );
          })}
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
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{email}</span>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {headerActions}
        </div>
      </header>

      <main className="flex w-full flex-col gap-8 p-4 md:p-8">{children}</main>
    </div>
  );
}
