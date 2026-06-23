'use client';

import { Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; text: string };

const SAUDACAO: Msg = {
  role: 'assistant',
  text: 'Oi! Sou o WayOn. Pode perguntar sobre recursos, planos, pra quem serve ou como começar.',
};

/** Chat flutuante do WayOn na landing: tira dúvidas do visitante chamando /api/ask. */
export function WayonChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([SAUDACAO]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const d = (await r.json()) as { answer?: string };
      setMsgs((m) => [
        ...m,
        { role: 'assistant', text: d.answer ?? 'Não consegui responder agora.' },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: 'Tive um problema. Tente de novo.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fechar o chat do WayOn' : 'Falar com o WayOn'}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border bg-primary/10 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold leading-none">WayOn</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">tira suas dúvidas</div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-white'
                      : 'border border-border bg-background text-foreground'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  digitando…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva sua dúvida…"
              maxLength={500}
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
