'use client';

import { useEffect, useState } from 'react';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Liga/desliga as notificações push deste aparelho (web push). */
export function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((s) => setEnabled(Boolean(s)))
        .catch(() => {});
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMsg('Permissão negada no navegador.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
      });
      const r = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!r.ok) throw new Error('falha');
      setEnabled(true);
      setMsg('Notificações ativadas neste aparelho.');
    } catch {
      setMsg('Não foi possível ativar agora.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
      setMsg('Notificações desativadas neste aparelho.');
    } catch {
      setMsg('Não foi possível desativar.');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/push/test', { method: 'POST' });
      const j = (await r.json().catch(() => ({}))) as { sent?: number };
      setMsg(
        j.sent
          ? 'Enviei uma notificação de teste agora.'
          : 'Ativo neste aparelho, mas o envio ainda não está ligado no servidor.',
      );
    } catch {
      setMsg('Falha ao enviar o teste.');
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Este navegador não suporta notificações push. No iPhone, instale o app na tela inicial
        (Compartilhar → Adicionar à Tela de Início) e abra por lá.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {enabled ? (
          <>
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              Desativar notificações
            </button>
            <button
              type="button"
              onClick={test}
              disabled={busy}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              Enviar teste
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Ativar notificações neste aparelho
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
