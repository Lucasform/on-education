import Link from 'next/link';
import type { ReactNode } from 'react';

export const fieldClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

export const cardClass = 'rounded-lg border border-border bg-card p-5';

/** Envolve uma <table> para rolar na horizontal no mobile sem estourar o layout. */
export const tableWrapClass = 'w-full overflow-x-auto';

/**
 * Cabeçalho padrão de página (título + descrição). `back` opcional renderiza um link de
 * voltar consistente acima do título (padrão único em todo o app).
 */
export function PageHeader({
  title,
  description,
  back,
}: {
  title: string;
  description?: string | ReactNode;
  back?: { href: string; label?: string };
}) {
  return (
    <div>
      {back && (
        <Link
          href={back.href}
          className="mb-1 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
        >
          ← {back.label ?? 'Voltar'}
        </Link>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span>
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
