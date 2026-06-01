import type { ReactNode } from 'react';

export const fieldClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

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
