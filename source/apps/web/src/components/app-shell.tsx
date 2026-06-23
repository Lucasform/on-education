'use client';

import type { TenantType } from '@on-education/core';
import type { Feature } from '@on-education/entitlements';
import { Lock, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { navFor } from '@/lib/nav';

import { useAgentName } from './agent-name-provider';
import { AppGrid } from './app-grid';
import { BottomNav } from './bottom-nav';
import { HideLockedToggle, useHideLocked } from './hide-locked';
import { LogoMark } from './logo-mark';
import { ProductTour } from './product-tour';
import { ThemeToggle } from './theme-toggle';

// Tour do sidebar (1ª vez): explica o que é cada seção do menu. Só entram os itens que
// realmente aparecem para o tenant (evita falar de recurso que ele não tem).
const SIDEBAR_TOUR: { href: string; title: string; body: string }[] = [
  { href: '/app', title: 'Início', body: 'Sua visão geral: atalhos, alertas e primeiros passos.' },
  { href: '/app/turmas', title: 'Turmas', body: 'Crie e organize as turmas.' },
  { href: '/app/alunos', title: 'Alunos', body: 'Cadastre alunos, abra a ficha e importe em lote.' },
  { href: '/app/ia', title: 'WayOn (IA)', body: 'Gere plano de aula, atividade, prova e correção em segundos.' },
  { href: '/app/atividades', title: 'Banco de atividades', body: 'Suas atividades, provas e trabalhos reutilizáveis.' },
  { href: '/app/sala/chamada', title: 'Sala de aula', body: 'Chamada, notas, diário e boletim ficam por aqui.' },
  { href: '/app/feed', title: 'Mural & feed', body: 'Novidades, stories e comunicação com a família.' },
  { href: '/app/financeiro', title: 'Financeiro', body: 'Mensalidades, despesas e fluxo de caixa.' },
  { href: '/app/calendario', title: 'Calendário', body: 'Eventos, agenda e datas importantes.' },
  { href: '/app/planos', title: 'Planos', body: 'Libere mais recursos quando a escola crescer.' },
];

function NavGroupBlock({
  group,
  pathname,
  onNavigate,
  badges,
  upgradeBadge,
  agentName,
}: {
  group: ReturnType<typeof navFor>[number];
  pathname: string;
  onNavigate: () => void;
  badges?: Record<string, number>;
  upgradeBadge: string;
  agentName: string;
}) {
  const label = group.isAgentGroup ? agentName : group.label;
  return (
    <div>
      {!group.hideLabel && (
        <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      )}
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.locked ? '/app/planos' : item.href}
                onClick={onNavigate}
                data-tour={`nav-${item.href}`}
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
  );
}

/**
 * Casca do app com sidebar de funcionalidades (padrão On Condomínio): grupos + itens, cada
 * um com sua rota. Destaca o item ativo (usePathname) e tem drawer no mobile.
 */
export function AppShell({
  tenantType,
  features,
  subtitle,
  headerActions,
  logoUrl,
  workspaceName,
  badges,
  children,
}: {
  tenantType: TenantType;
  /** Funcionalidades habilitadas do tenant (null = ungated) — marca itens travados no menu. */
  features?: readonly Feature[] | null;
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
  const agentName = useAgentName();
  const hideLocked = useHideLocked();
  const allGroups = navFor(tenantType, features);
  // Esconde os recursos bloqueados quando o usuário optou por isso (preferência do aparelho).
  const groups = allGroups
    .map((g) => ({ ...g, items: hideLocked ? g.items.filter((i) => !i.locked) : g.items }))
    .filter((g) => g.items.length > 0);
  const mainGroups = groups.filter((g) => !g.pinBottom);
  const bottomGroups = groups.filter((g) => g.pinBottom);
  const hasLocked = allGroups.some((g) => g.items.some((i) => i.locked));
  const upgradeBadge = tenantType === 'individual' ? 'Pro' : 'Full';

  // Passos do tour: só os itens do menu que realmente existem para este tenant.
  const navHrefs = new Set(groups.flatMap((g) => g.items.map((i) => i.href)));
  const tourSteps = SIDEBAR_TOUR.filter((s) => navHrefs.has(s.href)).map((s) => ({
    selector: `[data-tour="nav-${s.href}"]`,
    title: s.title,
    body: s.body,
  }));

  return (
    <div className="min-h-screen md:pl-64 print:pl-0">
      <ProductTour id="sidebar-v1" steps={tourSteps} />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card md:block print:hidden">
        <div className="flex h-14 items-center gap-3 border-b border-border px-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo da escola" className="h-8 w-8 shrink-0 rounded-xl object-cover shadow-sm" />
          ) : (
            <LogoMark size={32} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {workspaceName ?? 'Edu On Way'}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">Edu On Way</p>
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="ml-auto md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex h-[calc(100vh-3.5rem)] flex-col px-3 py-4">
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
            {mainGroups.map((g) => (
              <NavGroupBlock
                key={g.label}
                group={g}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
                badges={badges}
                upgradeBadge={upgradeBadge}
                agentName={agentName}
              />
            ))}
          </div>
          {bottomGroups.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              {bottomGroups.map((g) => (
                <NavGroupBlock
                  key={g.label}
                  group={g}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                  badges={badges}
                  upgradeBadge={upgradeBadge}
                  agentName={agentName}
                />
              ))}
            </div>
          )}
          {hasLocked && (
            <div className="mt-2 border-t border-border pt-2">
              <HideLockedToggle className="w-full justify-start" />
            </div>
          )}
        </nav>
      </aside>

      {/* Launcher em tela cheia no mobile (sem sidebar): ícones grandes, escolha e abra. */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background md:hidden print:hidden">
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 w-8 shrink-0 rounded-xl object-cover shadow-sm" />
            ) : (
              <LogoMark size={32} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {workspaceName ?? 'Edu On Way'}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">Edu On Way</p>
            </div>
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
            <AppGrid groups={allGroups} onNavigate={() => setOpen(false)} />
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

      {/* Largura total da tela (sem cap centralizado), no padrão do OnWay Condomínio.
          A leitura de documentos imprimíveis fica a cargo da própria página (article). */}
      <main className="flex w-full flex-col gap-6 p-4 pb-20 md:p-8 md:pb-8 print:p-0">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
