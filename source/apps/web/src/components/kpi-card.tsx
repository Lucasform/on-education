import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { cardClass } from './form';

/**
 * Card de indicador (KPI) padrão do app. Cobre as três variações que existiam soltas:
 * com ícone + link (dashboard), simples (relatórios) e com cor no valor (financeiro).
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  cor,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  href?: string;
  cor?: string;
}) {
  const body = (
    <>
      {Icon && <Icon className="h-5 w-5 text-primary" />}
      <div className={`${Icon ? 'mt-3 ' : ''}text-2xl font-semibold ${cor ?? ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={`${cardClass} block outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
      >
        {body}
      </Link>
    );
  }
  return <div className={cardClass}>{body}</div>;
}
