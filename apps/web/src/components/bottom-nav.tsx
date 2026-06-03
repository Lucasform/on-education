'use client';

import { CalendarDays, GraduationCap, Home, Sparkles, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navegação inferior no mobile (item 16, primeiro passo de app mobile). Atalhos para as
 * seções mais usadas; some no desktop (a sidebar assume) e na impressão. Comum aos dois
 * segmentos — destinos que existem tanto para escola quanto para professor autônomo.
 */
const ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Início', href: '/app', icon: Home },
  { label: 'Turmas', href: '/app/turmas', icon: Users },
  { label: 'Alunos', href: '/app/alunos', icon: GraduationCap },
  { label: 'EduON', href: '/app/ia', icon: Sparkles },
  { label: 'Agenda', href: '/app/calendario', icon: CalendarDays },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 backdrop-blur md:hidden print:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
