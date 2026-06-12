'use client';

import { Button } from '@on-education/ui';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Mostra um link público (origem + path) com botão de copiar. Resolve a origem no cliente. */
export function CopyLink({ path }: { path: string }) {
  const [url, setUrl] = useState(path);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          } catch {
            // sem permissão de clipboard: o usuário copia manualmente do campo.
          }
        }}
      >
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
