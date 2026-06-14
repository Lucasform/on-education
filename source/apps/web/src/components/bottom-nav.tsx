'use client';

import { CalendarDays, GraduationCap, Home, Sparkles, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAgentName } from './agent-name-provider';

const NAV_ITEMS: { label?: string; agentLabel?: true; href: string; icon: LucideIcon }[] = [
  { label: 'Início', href: '/app', icon: Home },
  { label: 'Turmas', href: '/app/turmas', icon: Users },
  { label: 'Alunos', href: '/app/alunos', icon: GraduationCap },
  { agentLabel: true, href: '/app/ia', icon: Sparkles },
  { label: 'Agenda', href: '/app/calendario', icon: CalendarDays },
];

export function BottomNav() {
  const pathname = usePathname();
  const agentName = useAgentName();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
        const Icon = item.icon;
        const label = item.agentLabel ? agentName : item.label!;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                active ? 'bg-primary/15' : ''
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
