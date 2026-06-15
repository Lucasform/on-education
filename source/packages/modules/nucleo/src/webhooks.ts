import { assertCan, type AuthContext } from '@on-education/auth';
import { webhookEndpoints, type DbClient } from '@on-education/db';
import { desc, eq, isNull } from 'drizzle-orm';

export async function listWebhookEndpoints(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(webhookEndpoints)
      .where(isNull(webhookEndpoints.deletedAt))
      .orderBy(desc(webhookEndpoints.createdAt)),
  );
}

export async function createWebhookEndpoint(
  client: DbClient,
  ctx: AuthContext,
  input: {
    url: string;
    events: string[];
    secret?: string;
  },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(webhookEndpoints)
      .values({
        tenantId: ctx.tenantId,
        url: input.url,
        events: input.events,
        secret: input.secret ?? null,
        active: true,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function toggleWebhookEndpoint(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  active: boolean,
) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(webhookEndpoints)
      .set({ active, updatedAt: new Date() })
      .where(eq(webhookEndpoints.id, id)),
  );
}

export async function deleteWebhookEndpoint(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(webhookEndpoints)
      .set({ deletedAt: new Date() })
      .where(eq(webhookEndpoints.id, id)),
  );
}
