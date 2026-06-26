'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Alerta = { label: string; href: string; count: number; tone: 'info' | 'warn' };

/**
 * Sino de alertas no cabeçalho: mostra o que precisa de atenção agora (rascunhos para revisar,
 * alunos em risco, solicitações abertas). Calculado em tempo real pela rota /api/alertas, sem
 * tabela nem cron. Atualiza ao montar e a cada 60s.
 */
export function AlertBell() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    async function load() {
      try {
        const r = await fetch('/api/alertas');
        const d = (await r.json()) as { alertas?: Alerta[]; total?: number };
        if (!vivo) return;
        setAlertas(d.alertas ?? []);
        setTotal(d.total ?? 0);
      } catch {
        /* silencioso */
      }
    }
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Alertas"
        className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Alertas
          </div>
          {alertas.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nada pendente. 🎉</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {alertas.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                  >
                    <span className="truncate">{a.label}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.tone === 'warn'
                          ? 'bg-amber-500/15 text-amber-600'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {a.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
