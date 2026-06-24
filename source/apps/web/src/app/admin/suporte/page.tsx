import { adminListMessages, listAllSupportTickets } from '@on-education/module-nucleo';

import { db } from '@/server/db';

import { SupportKanban } from './SupportKanban';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suporte · Admin' };

export default async function AdminSuportePage() {
  const client = db();
  const tickets = await listAllSupportTickets(client).catch(() => []);
  const enriched = await Promise.all(
    tickets.map(async (t) => ({
      id: t.id,
      kind: t.kind,
      status: t.status,
      tenantId: t.tenantId,
      tenantName: t.tenantName ?? null,
      createdByName: t.createdByName ?? null,
      createdAt: t.createdAt,
      messages: await adminListMessages(client, t.id).catch(() => []),
    })),
  );

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Suporte ({tickets.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mensagens das escolas/professores. Analise, responda e arraste pelo funil.
      </p>

      <SupportKanban tickets={enriched} />
    </>
  );
}
