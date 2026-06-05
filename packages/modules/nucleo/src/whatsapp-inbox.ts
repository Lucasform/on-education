import { assertCan, type AuthContext } from '@on-education/auth';
import {
  type DbClient,
  whatsappConnections,
  whatsappConversations,
  whatsappMessages,
} from '@on-education/db';
import { and, asc, desc, eq } from 'drizzle-orm';

// ============================================================================
// Lado WEBHOOK (sem sessão de tenant) — usa a conexão admin (client.db, sem RLS),
// escopada explicitamente por tenantId. Validação é pelo `secret` da rota.
// ============================================================================

/** Acha a conexão (e o tenant) pelo webhook_secret. Conexão admin (sem RLS). */
export async function findConnectionBySecret(client: DbClient, secret: string) {
  const rows = await client.db
    .select()
    .from(whatsappConnections)
    .where(eq(whatsappConnections.webhookSecret, secret));
  return rows[0] ?? null;
}

/** Grava uma mensagem RECEBIDA: upsert da conversa (por telefone) + insere a mensagem. */
export async function recordIncomingMessage(
  client: DbClient,
  tenantId: string,
  input: { phone: string; text: string; contactName?: string | null; waMessageId?: string | null },
): Promise<void> {
  const existing = (
    await client.db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.tenantId, tenantId),
          eq(whatsappConversations.phone, input.phone),
        ),
      )
  )[0];

  let conversationId: string;
  const preview = input.text.slice(0, 200);
  if (existing) {
    conversationId = existing.id;
    await client.db
      .update(whatsappConversations)
      .set({
        lastMessage: preview,
        lastMessageAt: new Date(),
        unread: existing.unread + 1,
        contactName: input.contactName ?? existing.contactName,
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversations.id, conversationId));
  } else {
    const rows = await client.db
      .insert(whatsappConversations)
      .values({
        tenantId,
        phone: input.phone,
        contactName: input.contactName ?? null,
        lastMessage: preview,
        lastMessageAt: new Date(),
        unread: 1,
      })
      .returning({ id: whatsappConversations.id });
    conversationId = rows[0]!.id;
  }

  await client.db.insert(whatsappMessages).values({
    tenantId,
    conversationId,
    direction: 'in',
    body: input.text,
    waMessageId: input.waMessageId ?? null,
  });
}

// ============================================================================
// Lado UI (com sessão) — withTenant + RBAC `communication`.
// ============================================================================

export async function listConversations(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(whatsappConversations).orderBy(desc(whatsappConversations.lastMessageAt)),
  );
}

export async function getConversation(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.id, id));
    return rows[0] ?? null;
  });
}

export async function listConversationMessages(client: DbClient, ctx: AuthContext, convId: string) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.conversationId, convId))
      .orderBy(asc(whatsappMessages.createdAt)),
  );
}

export async function markConversationRead(client: DbClient, ctx: AuthContext, convId: string) {
  assertCan(ctx, 'update', 'communication');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(whatsappConversations)
      .set({ unread: 0, updatedAt: new Date() })
      .where(eq(whatsappConversations.id, convId)),
  );
}

/** Registra uma mensagem ENVIADA (após o disparo no Evolution) e atualiza a conversa. */
export async function recordOutgoingMessage(
  client: DbClient,
  ctx: AuthContext,
  convId: string,
  body: string,
  waMessageId?: string | null,
) {
  assertCan(ctx, 'create', 'communication');
  return client.withTenant(ctx.tenantId, async (tx) => {
    await tx.insert(whatsappMessages).values({
      tenantId: ctx.tenantId,
      conversationId: convId,
      direction: 'out',
      body,
      waMessageId: waMessageId ?? null,
    });
    await tx
      .update(whatsappConversations)
      .set({ lastMessage: body.slice(0, 200), lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(whatsappConversations.id, convId));
  });
}
