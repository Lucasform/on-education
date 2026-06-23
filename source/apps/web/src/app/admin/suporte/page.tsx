import { adminListMessages, listAllSupportTickets } from '@on-education/module-nucleo';

import { db } from '@/server/db';

import { adminReplySupportAction, setSupportStatusAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suporte · Admin' };

const KIND: Record<string, string> = {
  sugestao: 'Sugestão',
  elogio: 'Elogio',
  problema: 'Problema',
  duvida: 'Dúvida',
};
const COLS: { id: string; label: string }[] = [
  { id: 'novo', label: 'Novos' },
  { id: 'em_analise', label: 'Em análise' },
  { id: 'respondido', label: 'Respondidos' },
  { id: 'resolvido', label: 'Resolvidos' },
];

export default async function AdminSuportePage() {
  const client = db();
  const tickets = await listAllSupportTickets(client).catch(() => []);
  const msgs = await Promise.all(
    tickets.map(async (t) => ({ id: t.id, m: await adminListMessages(client, t.id).catch(() => []) })),
  );
  const msgMap = new Map(msgs.map((x) => [x.id, x.m]));

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Suporte ({tickets.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mensagens das escolas/professores. Analise, responda e mova pelo funil.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((col) => {
          const items = tickets.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
              <h2 className="flex items-center justify-between text-sm font-medium">
                {col.label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {items.length}
                </span>
              </h2>
              {items.length === 0 && <p className="text-xs text-muted-foreground">Vazio.</p>}
              {items.map((t) => (
                <div key={t.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-1.5 py-0.5">{KIND[t.kind] ?? t.kind}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="mt-1 font-medium">{t.tenantName ?? 'Escola'}</p>
                  {t.createdByName && (
                    <p className="text-[11px] text-muted-foreground">por {t.createdByName}</p>
                  )}
                  <ul className="mt-2 space-y-1.5">
                    {(msgMap.get(t.id) ?? []).map((m) => (
                      <li key={m.id} className={`flex ${m.fromAdmin ? 'justify-end' : 'justify-start'}`}>
                        <span
                          className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 text-xs ${
                            m.fromAdmin ? 'bg-primary text-white' : 'border border-border bg-card'
                          }`}
                        >
                          {m.body}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <form action={adminReplySupportAction} className="mt-2 flex items-center gap-1">
                    <input type="hidden" name="ticketId" value={t.id} />
                    <input type="hidden" name="tenantId" value={t.tenantId} />
                    <input
                      name="body"
                      placeholder="Responder…"
                      className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs outline-none"
                    />
                    <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">
                      Enviar
                    </button>
                  </form>

                  <form action={setSupportStatusAction} className="mt-1.5 flex items-center gap-1">
                    <input type="hidden" name="ticketId" value={t.id} />
                    <select name="status" defaultValue={t.status} className="rounded-md border border-border bg-card px-1 py-0.5 text-[11px]">
                      {COLS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-accent">
                      Mover
                    </button>
                  </form>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
