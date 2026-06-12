import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  backHref = '/',
  backLabel = 'Voltar',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Para onde o "← Voltar" leva. Default: menu anterior (landing). */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute left-6 top-6">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {backLabel}
        </Link>
      </div>
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link href={backHref} className="mb-6 flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-primary" />
          <span className="font-semibold">Edu On Way</span>
        </Link>
        <h1 className="text-center text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
