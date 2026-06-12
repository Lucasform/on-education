import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, messages } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import type { CreateMessageInput } from '@on-education/validation';
import { desc, eq, isNull } from 'drizzle-orm';

/**
 * Mensagens internas para responsáveis (Fase 1A.3). Conteúdo é PII: nunca logar.
 * Gate em `communication.light` (todos os planos têm). Checagem tripla; soft delete.
 */
const FEATURE = 'communication.light';

export async function createMessage(client: DbClient, ctx: AuthContext, input: CreateMessageInput) {
  assertCan(ctx, 'create', 'message');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(messages)
      .values({
        tenantId: ctx.tenantId,
        guardianId: input.guardianId,
        studentId: input.studentId ?? null,
        subject: input.subject,
        body: input.body,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listMessages(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'message');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(messages).where(isNull(messages.deletedAt)).orderBy(desc(messages.createdAt)),
  );
}

export async function deleteMessage(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'message');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, id)),
  );
}
