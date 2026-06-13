'use client';

interface PrintButtonProps {
  className?: string;
  label?: string;
}

export function PrintButton({ className, label = 'Imprimir ficha' }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent print:hidden'
      }
    >
      {label}
    </button>
  );
}
