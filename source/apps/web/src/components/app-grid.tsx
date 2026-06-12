'use client';

import Link from 'next/link';

import type { NavGroup } from '@/lib/nav';

/**
 * Launcher de apps (padrão de home de aplicativo): ícones grandes, tocáveis, agrupados por
 * seção. Usado como tela inicial no mobile e como menu em tela cheia. Cada tile abre a rota.
 */
export function AppGrid({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.label}>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label}
          </h3>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
            {g.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center transition-transform active:scale-95"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm transition-colors group-hover:bg-primary/20">
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground/90">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
