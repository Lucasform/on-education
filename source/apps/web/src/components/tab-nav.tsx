'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface TabItem {
  href: string;
  label: string;
  /** Prefixos extras que também ativam esta aba (ex.: a aba de Segurança ativa em /mfa). */
  match?: string[];
}

/** Navegação por abas no estilo do app (sublinhado), com a aba ativa pelo pathname. */
export function TabNav({ tabs }: { tabs: TabItem[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active =
          pathname === t.href ||
          pathname.startsWith(`${t.href}/`) ||
          (t.match?.some((m) => pathname === m || pathname.startsWith(`${m}/`)) ?? false);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
