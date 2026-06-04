'use client';

import { Button } from '@on-education/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'connecting' | 'open' | 'loading' | 'error';

/**
 * Conexão self-service do WhatsApp (Evolution, ADR 0006): botão Conectar → mostra o QR e fica
 * fazendo polling do status até abrir. Quando conectado, mostra o número e o botão Desconectar.
 */
export function WhatsappConnect({
  initialActive,
  initialPhone,
}: {
  initialActive: boolean;
  initialPhone: string | null;
}) {
  const [status, setStatus] = useState<Status>(initialActive ? 'open' : 'idle');
  const [qr, setQr] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const r = await fetch('/api/whatsapp/status', { cache: 'no-store' });
      const d = await r.json();
      if (d.active) {
        setStatus('open');
        setPhone(d.phone ?? null);
        setQr(null);
        stopPolling();
      }
    } catch {
      /* tenta de novo no próximo tick */
    }
  }, [stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  async function connect() {
    setStatus('loading');
    setError(null);
    try {
      const r = await fetch('/api/whatsapp/connect', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? 'Não foi possível conectar.');
        setStatus('error');
        return;
      }
      if (d.status === 'open') {
        setStatus('open');
        return;
      }
      setQr(d.qr ?? null);
      setStatus('connecting');
      stopPolling();
      timer.current = setInterval(poll, 4000);
    } catch {
      setError('Falha de rede ao conectar.');
      setStatus('error');
    }
  }

  async function logout() {
    setStatus('loading');
    stopPolling();
    await fetch('/api/whatsapp/logout', { method: 'POST' }).catch(() => {});
    setQr(null);
    setPhone(null);
    setStatus('idle');
  }

  if (status === 'open') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm text-success">
          <span className="h-2 w-2 rounded-full bg-success" /> Conectado
          {phone ? ` · ${phone}` : ''}
        </span>
        <Button size="sm" variant="outline" onClick={logout}>
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {qr && status === 'connecting' && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
          <img
            src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code do WhatsApp"
            className="h-56 w-56"
          />
          <p className="text-center text-xs text-muted-foreground">
            Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e escaneie o código.
            Aguardando a leitura…
          </p>
        </div>
      )}

      <div>
        <Button size="sm" onClick={connect} disabled={status === 'loading'}>
          {status === 'loading'
            ? 'Gerando…'
            : status === 'connecting'
              ? 'Gerar novo QR'
              : 'Conectar WhatsApp'}
        </Button>
      </div>
    </div>
  );
}
