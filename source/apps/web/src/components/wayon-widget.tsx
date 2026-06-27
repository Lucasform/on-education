'use client';

import { Bot, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Turn = { role: 'user' | 'wayon'; text: string };

const SUGESTOES = [
  'Como estão minhas turmas?',
  'Tenho alunos em risco?',
  'Resumo do mês',
];

/** WayON flutuante (canto inferior direito): tira dúvidas sobre o app, turmas e resultados.
 * Responde só com os números do próprio usuário, montados no servidor. */
export function WayonWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  async function ask(pergunta: string) {
    const q = pergunta.trim();
    if (!q || loading) return;
    setTurns((t) => [...t, { role: 'user', text: q }]);
    setText('');
    setLoading(true);
    try {
      const r = await fetch('/api/wayon', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pergunta: q }),
      });
      const d = (await r.json()) as { text?: string; error?: string };
      setTurns((t) => [...t, { role: 'wayon', text: d.text ?? d.error ?? 'Não consegui responder agora.' }]);
    } catch {
      setTurns((t) => [...t, { role: 'wayon', text: 'Não consegui responder agora. Tente de novo.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="WayON"
        className="fixed bottom-36 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-24 print:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-52 right-4 z-40 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:bottom-24 md:right-24 print:hidden">
          <div className="flex items-center gap-2 border-b border-border bg-primary/10 px-4 py-3">
            <Bot className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">WayON</div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {turns.length === 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Pergunte sobre o seu app: turmas, alunos em risco, resultados do mês. Eu respondo
                  com os seus números, sem dados pessoais.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 text-xs ${
                    t.role === 'user' ? 'bg-primary text-white' : 'border border-border bg-background'
                  }`}
                >
                  {t.text}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <span className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
                  WayON está pensando…
                </span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
            className="border-t border-border p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Pergunte ao WayON…"
                className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={loading || !text.trim()}
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
