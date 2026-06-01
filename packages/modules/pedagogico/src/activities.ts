import { assertCan, type AuthContext } from '@on-education/auth';
import { activities, type DbClient } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import type {
  CreateActivityInput,
  SearchActivitiesInput,
  UpdateActivityInput,
} from '@on-education/validation';
import { and, arrayContains, desc, eq, ilike, isNull } from 'drizzle-orm';

/**
 * Banco de atividades pessoal (Fase 1B.3). Disponível a 🏫 e 👤 via entitlement
 * `activities.bank`. Checagem tripla em toda operação; soft delete (Master Spec §5).
 */
const FEATURE = 'activities.bank' as const;

export async function createActivity(
  client: DbClient,
  ctx: AuthContext,
  input: CreateActivityInput,
) {
  assertCan(ctx, 'create', 'activity');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(activities)
      .values({
        tenantId: ctx.tenantId,
        title: input.title,
        subject: input.subject ?? null,
        content: input.content,
        tags: input.tags,
        aiGenerated: input.aiGenerated,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function updateActivity(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  input: UpdateActivityInput,
) {
  assertCan(ctx, 'update', 'activity');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .update(activities)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return rows[0] ?? null;
  });
}

export async function deleteActivity(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'activity');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(activities).set({ deletedAt: new Date() }).where(eq(activities.id, id)),
  );
}

export async function listActivities(
  client: DbClient,
  ctx: AuthContext,
  search: SearchActivitiesInput = {},
) {
  assertCan(ctx, 'read', 'activity');
  return client.withTenant(ctx.tenantId, (tx) => {
    const filters = [isNull(activities.deletedAt)];
    if (search.tag) filters.push(arrayContains(activities.tags, [search.tag]));
    if (search.q) filters.push(ilike(activities.title, `%${search.q}%`));
    return tx
      .select()
      .from(activities)
      .where(and(...filters))
      .orderBy(desc(activities.updatedAt));
  });
}
