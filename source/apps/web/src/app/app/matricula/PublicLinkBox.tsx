'use client';

import { useState } from 'react';

export function PublicLinkBox({ tenantId }: { tenantId: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/matricula/${tenantId}`;
  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-medium">Link de pré-matrícula online</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Compartilhe este link com famílias interessadas. Elas preenchem os dados e a solicitação
        aparece aqui para você confirmar.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-md border border-border bg-background px-3 py-2 text-xs">
          {url}
        </code>
        <button
          type="button"
          onClick={copy}
          className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {copied ? 'Copiado ✓' : 'Copiar'}
        </button>
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border px-3 py-2 text-xs hover:bg-accent"
        >
          Abrir
        </a>
      </div>
    </div>
  );
}
