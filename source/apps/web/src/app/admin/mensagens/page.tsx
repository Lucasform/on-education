import { adminListMessages, listAllSupportTickets, listAllTenants } from '@on-education/module-nucleo';

import { db } from '@/server/db';

import { adminReplyConversationAction, adminStartConversationAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mensagens · Admin' };

export default async function AdminMensagensPage() {
  const client = db();
  const [todosTickets, escolas] = await Promise.all([
    listAllSupportTickets(client).catch(() => []),
    listAllTenants(client).catch(() => []),
  ]);

  const conversas = await Promise.all(
    todosTickets
      .filter((t) => t.initiatedByAdmin)
      .map(async (t) => ({
        id: t.id,
        tenantId: t.tenantId,
        tenantName: t.tenantName ?? 'Escola',
        status: t.status,
        messages: await adminListMessages(client, t.id).catch(() => []),
      })),
  );

  const field =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Mensagens</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você inicia a conversa com a escola. Ela recebe no balão de Suporte dela e responde por lá.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[20rem_1fr]">
        {/* Nova mensagem */}
        <form
          action={adminStartConversationAction}
          className="flex h-fit flex-col gap-3 rounded-xl border border-border bg-card p-4"
        >
          <h2 className="text-sm font-medium">Nova mensagem</h2>
          <select name="tenantId" required defaultValue="" className={field}>
            <option value="" disabled>
              Escolha a escola…
            </option>
            {escolas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <textarea name="body" rows={4} required placeholder="Escreva a mensagem…" className={`${field} resize-none`} />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Enviar mensagem
          </button>
        </form>

        {/* Conversas iniciadas pelo admin */}
        <div className="space-y-4">
          {conversas.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Nenhuma conversa iniciada ainda. Use o formulário ao lado para falar com uma escola.
            </p>
          ) : (
            conversas.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{c.tenantName}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {c.status}
                  </span>
                </div>
                <ul className="mb-3 space-y-1.5">
                  {c.messages.map((m) => (
                    <li key={m.id} className={`flex ${m.fromAdmin ? 'justify-end' : 'justify-start'}`}>
                      <span
                        className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 text-xs ${
                          m.fromAdmin ? 'bg-primary text-white' : 'border border-border bg-background'
                        }`}
                      >
                        {m.body}
                      </span>
                    </li>
                  ))}
                </ul>
                <form action={adminReplyConversationAction} className="flex items-center gap-2">
                  <input type="hidden" name="ticketId" value={c.id} />
                  <input type="hidden" name="tenantId" value={c.tenantId} />
                  <input name="body" placeholder="Responder…" className={`${field} flex-1`} />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
