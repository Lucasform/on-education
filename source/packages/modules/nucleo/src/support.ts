import type { AuthContext } from '@on-education/auth';
import {
  type DbClient,
  supportMessages,
  supportTickets,
  tenants,
  users,
} from '@on-education/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

const KINDS = new Set(['sugestao', 'elogio', 'problema', 'duvida']);

// ---------------- Lado do TENANT (escola/professor) ----------------

export async function createSupportTicket(
  client: DbClient,
  ctx: AuthContext,
  input: { kind: string; subject?: string | null; body: string },
) {
  const body = (input.body ?? '').trim();
  if (!body) throw new Error('Escreva sua mensagem.');
  const kind = KINDS.has(input.kind) ? input.kind : 'sugestao';
  const u = await client.db
    .select({ n: users.fullName, e: users.email })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  const who = u[0]?.n ?? u[0]?.e ?? null;
  return client.withTenant(ctx.tenantId, async (tx) => {
    const [t] = await tx
      .insert(supportTickets)
      .values({
        tenantId: ctx.tenantId,
        kind,
        subject: input.subject ?? null,
        createdByName: who,
        createdBy: ctx.userId,
      })
      .returning({ id: supportTickets.id });
    await tx.insert(supportMessages).values({
      tenantId: ctx.tenantId,
      ticketId: t!.id,
      body,
      fromAdmin: false,
      authorName: who,
      createdBy: ctx.userId,
    });
    return t!;
  });
}

export async function listMyTickets(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.createdBy, ctx.userId), isNull(supportTickets.deletedAt)))
      .orderBy(desc(supportTickets.updatedAt))
      .limit(50),
  );
}

export async function listSupportMessages(client: DbClient, ctx: AuthContext, ticketId: string) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(supportMessages.createdAt),
  );
}

export async function replyTicketAsUser(
  client: DbClient,
  ctx: AuthContext,
  ticketId: string,
  body: string,
) {
  const text = (body ?? '').trim();
  if (!text) return;
  await client.withTenant(ctx.tenantId, async (tx) => {
    await tx.insert(supportMessages).values({
      tenantId: ctx.tenantId,
      ticketId,
      body: text,
      fromAdmin: false,
      createdBy: ctx.userId,
    });
    await tx
      .update(supportTickets)
      .set({ status: 'novo', updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId));
  });
}

// ---------------- Lado do ADMIN do app (cross-tenant, conexão dona) ----------------

export async function listAllSupportTickets(client: DbClient) {
  return client.db
    .select({
      id: supportTickets.id,
      tenantId: supportTickets.tenantId,
      tenantName: tenants.name,
      kind: supportTickets.kind,
      status: supportTickets.status,
      createdByName: supportTickets.createdByName,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .leftJoin(tenants, eq(tenants.id, supportTickets.tenantId))
    .where(isNull(supportTickets.deletedAt))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(500);
}

export async function adminListMessages(client: DbClient, ticketId: string) {
  return client.db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.ticketId, ticketId))
    .orderBy(supportMessages.createdAt);
}

export async function adminReplyTicket(
  client: DbClient,
  ticketId: string,
  tenantId: string,
  body: string,
  adminName = 'Equipe Edu On Way',
) {
  const text = (body ?? '').trim();
  if (!text) return;
  await client.db.insert(supportMessages).values({
    tenantId,
    ticketId,
    body: text,
    fromAdmin: true,
    authorName: adminName,
  });
  // Responder não muda a coluna: só marca atividade. O admin move/resolve manualmente.
  await client.db
    .update(supportTickets)
    .set({ updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));
}

export async function setSupportStatus(client: DbClient, ticketId: string, status: string) {
  const ok = ['novo', 'em_analise', 'resolvido', 'arquivado'];
  await client.db
    .update(supportTickets)
    .set({ status: ok.includes(status) ? status : 'novo', updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));
}

/** Exclusão (soft delete) de um ticket de suporte pelo admin. Some da lista do admin. */
export async function deleteSupportTicket(client: DbClient, ticketId: string) {
  await client.db
    .update(supportTickets)
    .set({ deletedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));
}
