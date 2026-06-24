'use client';

import { useState } from 'react';

import { adminDeleteSupportAction, adminReplySupportAction, setSupportStatusAction } from './actions';

type Msg = { id: string; body: string; fromAdmin: boolean };
export type KanbanTicket = {
  id: string;
  kind: string;
  status: string;
  tenantId: string;
  tenantName: string | null;
  createdByName: string | null;
  createdAt: string | Date;
  messages: Msg[];
};

// Colunas no padrão do On Condomínio: Enviado → Em análise → Resolvido → Arquivado.
const COLUNAS = [
  { id: 'novo', label: 'Enviado', desc: 'Mensagens recém recebidas', accent: 'border-amber-500/40 bg-amber-500/5' },
  { id: 'em_analise', label: 'Em análise', desc: 'Em avaliação pela plataforma', accent: 'border-sky-500/40 bg-sky-500/5' },
  { id: 'resolvido', label: 'Resolvido', desc: 'Atendidas ou respondidas', accent: 'border-emerald-500/40 bg-emerald-500/5' },
  { id: 'arquivado', label: 'Arquivado', desc: 'Encerradas sem ação necessária', accent: 'border-slate-500/40 bg-slate-500/5' },
] as const;

const KIND: Record<string, { label: string; cls: string }> = {
  sugestao: { label: 'Sugestão', cls: 'bg-violet-500/20 text-violet-300' },
  elogio: { label: 'Elogio', cls: 'bg-emerald-500/20 text-emerald-300' },
  problema: { label: 'Problema', cls: 'bg-red-500/20 text-red-300' },
  duvida: { label: 'Dúvida', cls: 'bg-sky-500/20 text-sky-300' },
};

/** "Respondido" (legado) cai na coluna Resolvido; status desconhecido → Enviado. */
function colOf(status: string): string {
  if (status === 'respondido') return 'resolvido';
  return COLUNAS.some((c) => c.id === status) ? status : 'novo';
}

export function SupportKanban({ tickets }: { tickets: KanbanTicket[] }) {
  const [items, setItems] = useState(tickets);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  async function move(id: string, status: string) {
    const t = items.find((x) => x.id === id);
    if (!t || colOf(t.status) === status) return;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x))); // otimista
    const fd = new FormData();
    fd.set('ticketId', id);
    fd.set('status', status);
    await setSupportStatusAction(fd);
  }

  async function reply(t: KanbanTicket, body: string, reset: () => void) {
    const text = body.trim();
    if (!text) return;
    reset();
    setItems((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? { ...x, messages: [...x.messages, { id: `tmp-${x.messages.length}`, body: text, fromAdmin: true }] }
          : x,
      ),
    );
    const fd = new FormData();
    fd.set('ticketId', t.id);
    fd.set('tenantId', t.tenantId);
    fd.set('body', text);
    await adminReplySupportAction(fd);
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir esta mensagem de suporte?')) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    const fd = new FormData();
    fd.set('ticketId', id);
    await adminDeleteSupportAction(fd);
  }

  const inCol = (id: string) => items.filter((t) => colOf(t.status) === id);

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUNAS.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => {
            e.preventDefault();
            setOverCol(col.id);
          }}
          onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) void move(dragId, col.id);
            setDragId(null);
            setOverCol(null);
          }}
          className={`flex min-h-[180px] flex-col rounded-xl border p-2.5 transition-colors ${col.accent} ${
            overCol === col.id ? 'ring-2 ring-primary' : ''
          }`}
        >
          <header className="mb-2 px-1">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{col.label}</h2>
              <span className="font-mono text-xs text-muted-foreground">{inCol(col.id).length}</span>
            </div>
            <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{col.desc}</p>
          </header>

          {inCol(col.id).length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground/60">vazio</div>
          )}

          <div className="space-y-2">
            {inCol(col.id).map((t) => {
              const k = KIND[t.kind] ?? { label: t.kind, cls: 'bg-muted text-muted-foreground' };
              // Em Resolvido/Arquivado o card é minimalista: só tipo + cliente + ações.
              const closed = col.id === 'resolvido' || col.id === 'arquivado';
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`cursor-grab rounded-lg border border-border bg-background p-2.5 active:cursor-grabbing ${
                    dragId === t.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${k.cls}`}>
                      {k.label}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs font-semibold">{t.tenantName ?? 'Escola'}</p>

                  {!closed && (
                    <>
                      {t.createdByName && (
                        <p className="break-words text-[10px] text-muted-foreground">por {t.createdByName}</p>
                      )}

                      {t.messages.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {t.messages.map((m) => (
                            <li key={m.id} className={`flex ${m.fromAdmin ? 'justify-end' : 'justify-start'}`}>
                              <span
                                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-2 py-1 text-[11px] ${
                                  m.fromAdmin ? 'bg-primary text-white' : 'border border-border bg-card'
                                }`}
                              >
                                {m.body}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <ReplyBox onSend={(b, reset) => reply(t, b, reset)} />
                    </>
                  )}

                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {COLUNAS.filter((c) => c.id !== col.id).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => move(t.id, c.id)}
                        className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                      >
                        → {c.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void remove(t.id)}
                      className="ml-auto rounded px-2 py-0.5 text-[10px] text-muted-foreground transition hover:text-red-500"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReplyBox({ onSend }: { onSend: (body: string, reset: () => void) => void }) {
  const [v, setV] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend(v, () => setV(''));
      }}
      className="mt-1.5 flex items-center gap-1"
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Responder…"
        className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
      >
        Enviar
      </button>
    </form>
  );
}
