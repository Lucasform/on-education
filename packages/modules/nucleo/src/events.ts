import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, events } from '@on-education/db';
import type { CreateEventInput } from '@on-education/validation';
import { and, asc, eq, gte, isNotNull, isNull } from 'drizzle-orm';

/** Calendário/agenda de eventos. Checagem tripla; gate em `classes.manage`. */
import { assertEntitled } from './entitlement';

export async function createEvent(client: DbClient, ctx: AuthContext, input: CreateEventInput) {
  assertCan(ctx, 'create', 'event');
  await assertEntitled(client, ctx.tenantId, 'classes.manage');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(events)
      .values({
        tenantId: ctx.tenantId,
        title: input.title,
        description: input.description ?? null,
        date: input.date,
        time: input.time ?? null,
        classId: input.classId ?? null,
        kind: input.kind ?? 'evento',
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listEvents(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'event');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(events)
      .where(isNull(events.deletedAt))
      .orderBy(asc(events.date), asc(events.time)),
  );
}

/** Próximos eventos (a partir de hoje). */
export async function listUpcomingEvents(client: DbClient, ctx: AuthContext, fromDate: string) {
  assertCan(ctx, 'read', 'event');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(events)
      .where(and(isNull(events.deletedAt), gte(events.date, fromDate)))
      .orderBy(asc(events.date), asc(events.time)),
  );
}

export async function listDeletedEvents(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'event');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(events).where(isNotNull(events.deletedAt)),
  );
}

export async function deleteEvent(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'event');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(events).set({ deletedAt: new Date() }).where(eq(events.id, id)),
  );
}

export async function restoreEvent(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'event');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(events).set({ deletedAt: null }).where(eq(events.id, id)),
  );
}
