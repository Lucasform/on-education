'use client';

import Link from 'next/link';

import { Lock, type NavGroup } from '@/lib/nav';

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
              // Bloqueado pelo plano: ícone com cadeado e o toque leva para os Planos.
              const href = item.locked ? '/app/planos' : item.href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={onNavigate}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center transition-transform active:scale-95"
                >
                  <span
                    className={`relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm transition-colors ${
                      item.locked
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                    {item.locked && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/80 text-background ring-2 ring-card">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                  <span
                    className={`line-clamp-2 text-[11px] font-medium leading-tight ${
                      item.locked ? 'text-muted-foreground' : 'text-foreground/90'
                    }`}
                  >
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
