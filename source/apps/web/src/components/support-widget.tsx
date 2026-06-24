'use client';

import { LifeBuoy, Send, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Msg = { id: string; body: string; fromAdmin: boolean; authorName: string | null; createdAt: string };
type Ticket = {
  id: string;
  kind: string;
  status: string;
  createdAt: string;
  messages: Msg[];
};

const KIND_LABEL: Record<string, string> = {
  sugestao: 'Sugestão',
  elogio: 'Elogio',
  problema: 'Problema',
  duvida: 'Dúvida',
};
const STATUS_LABEL: Record<string, string> = {
  novo: 'Enviado',
  em_analise: 'Em análise',
  respondido: 'Resolvido',
  resolvido: 'Resolvido',
  arquivado: 'Arquivado',
};

/** Canal de suporte flutuante (canto inferior direito): manda sugestão/elogio/problema e
 * acompanha a resposta do time por chat interno. */
export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kind, setKind] = useState('sugestao');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/support');
      const d = (await r.json()) as { tickets: Ticket[] };
      setTickets(d.tickets ?? []);
    } catch {
      /* ignora */
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await fetch('/api/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, body }),
      });
      setText('');
      await load();
    } finally {
      setSending(false);
    }
  }

  async function reply(ticketId: string, body: string) {
    if (!body.trim()) return;
    await fetch('/api/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticketId, body }),
    });
    await load();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Suporte"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6 print:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-40 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:bottom-24 md:right-6 print:hidden">
          <div className="flex items-center gap-2 border-b border-border bg-primary/10 px-4 py-3">
            <LifeBuoy className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Suporte</div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {tickets.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Mande uma sugestão, elogio, dúvida ou relate um problema. A gente responde por aqui.
              </p>
            )}
            {tickets.map((t) => (
              <div key={t.id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-1.5 py-0.5">{KIND_LABEL[t.kind] ?? t.kind}</span>
                  <span>{STATUS_LABEL[t.status] ?? t.status}</span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {t.messages.map((m) => (
                    <li key={m.id} className={`flex ${m.fromAdmin ? 'justify-start' : 'justify-end'}`}>
                      <span
                        className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 text-xs ${
                          m.fromAdmin ? 'border border-border bg-background' : 'bg-primary text-white'
                        }`}
                      >
                        {m.body}
                      </span>
                    </li>
                  ))}
                </ul>
                {t.status !== 'resolvido' && (
                  <ReplyBox onSend={(b) => reply(t.id, b)} />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={send} className="border-t border-border p-3">
            <div className="mb-2 flex gap-2">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva sua mensagem…"
                className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                aria-label="Enviar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function ReplyBox({ onSend }: { onSend: (body: string) => void }) {
  const [v, setV] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) {
          onSend(v);
          setV('');
        }
      }}
      className="mt-2 flex items-center gap-1"
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Responder…"
        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
      />
      <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">
        Enviar
      </button>
    </form>
  );
}
