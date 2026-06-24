'use client';

import { useState } from 'react';

import { deleteWorkRequestAction, setWorkRequestStatusAction } from './actions';

export type PainelCard = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  status: string;
  createdAt: string;
  requestedByName: string | null;
  resolution: string | null;
  copies: number | null;
  studentName: string | null;
  activityName: string | null;
};

const TIPO: Record<string, { label: string; cls: string }> = {
  ocorrencia: { label: 'Ocorrência', cls: 'bg-red-500/10 text-red-500' },
  servico: { label: 'Serviço', cls: 'bg-blue-500/10 text-blue-500' },
  impressao: { label: 'Impressão', cls: 'bg-violet-500/10 text-violet-500' },
  comparecimento: { label: 'Comparecimento', cls: 'bg-amber-500/10 text-amber-500' },
};

const COLUNAS = [
  { id: 'enviada', label: 'Enviadas', desc: 'Solicitações recém abertas', accent: 'border-amber-500/40 bg-amber-500/5' },
  { id: 'em_analise', label: 'Em análise', desc: 'Em andamento pela gestão', accent: 'border-sky-500/40 bg-sky-500/5' },
  { id: 'resolvida', label: 'Resolvidas', desc: 'Concluídas', accent: 'border-emerald-500/40 bg-emerald-500/5' },
] as const;

function quando(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function PainelKanban({ cards, gestao }: { cards: PainelCard[]; gestao: boolean }) {
  const [items, setItems] = useState(cards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  async function move(id: string, status: string, resolution?: string) {
    const c = items.find((x) => x.id === id);
    if (!c || c.status === status) return;
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status, resolution: resolution ?? x.resolution } : x)),
    );
    const fd = new FormData();
    fd.set('id', id);
    fd.set('status', status);
    if (resolution) fd.set('resolution', resolution);
    await setWorkRequestStatusAction(fd);
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir esta solicitação?')) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    const fd = new FormData();
    fd.set('id', id);
    await deleteWorkRequestAction(fd);
  }

  const inCol = (id: string) => items.filter((c) => c.status === id);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUNAS.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => {
            if (!gestao) return;
            e.preventDefault();
            setOverCol(col.id);
          }}
          onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            if (gestao && dragId) void move(dragId, col.id);
            setDragId(null);
            setOverCol(null);
          }}
          className={`flex min-h-[280px] flex-col rounded-xl border p-3 transition-colors ${col.accent} ${
            overCol === col.id ? 'ring-2 ring-primary' : ''
          }`}
        >
          <header className="mb-3 px-1">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{col.label}</h2>
              <span className="font-mono text-xs text-muted-foreground">{inCol(col.id).length}</span>
            </div>
            <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{col.desc}</p>
          </header>

          {inCol(col.id).length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground/60">vazio</div>
          )}

          <div className="space-y-3">
            {inCol(col.id).map((r) => {
              const t = TIPO[r.type] ?? TIPO.servico!;
              return (
                <div
                  key={r.id}
                  draggable={gestao}
                  onDragStart={() => setDragId(r.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`rounded-lg border border-border bg-background p-3 text-sm ${
                    gestao ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${dragId === r.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.cls}`}>
                      {t.label}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{quando(r.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 break-words font-medium">{r.title}</p>
                  {r.body && (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {r.body}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {r.requestedByName && <span>por {r.requestedByName}</span>}
                    {r.studentName && <span>aluno: {r.studentName}</span>}
                    {r.type === 'impressao' && r.copies ? <span>{r.copies} cópias</span> : null}
                    {r.type === 'impressao' && r.activityName && <span>atividade: {r.activityName}</span>}
                  </div>
                  {r.resolution && (
                    <p className="mt-2 break-words rounded-md bg-success/10 p-2 text-xs text-success">
                      Conclusão: {r.resolution}
                    </p>
                  )}

                  {gestao && (
                    <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
                      <div className="flex flex-wrap gap-1">
                        {COLUNAS.filter((c) => c.id !== r.status).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => void move(r.id, c.id)}
                            className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                      {r.status !== 'resolvida' && <ResolveBox onResolve={(txt) => move(r.id, 'resolvida', txt)} />}
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void remove(r.id)}
                      className="text-[11px] text-muted-foreground transition hover:text-red-500"
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

function ResolveBox({ onResolve }: { onResolve: (resolution: string) => void }) {
  const [v, setV] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onResolve(v.trim());
        setV('');
      }}
      className="flex items-center gap-1"
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Conclusão (opcional)"
        className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
      >
        Resolver ✓
      </button>
    </form>
  );
}
