import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, scheduleExceptions, scheduleSlots, subjects } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import type {
  CreateScheduleExceptionInput,
  CreateScheduleSlotInput,
} from '@on-education/validation';
import { asc, desc, eq } from 'drizzle-orm';

/**
 * Cronograma/horário semanal da turma (item 7). Checagem tripla (RBAC `lesson` + entitlement
 * `classes.manage` + RLS). Reusa turmas/disciplinas. Um slot = matéria num dia/horário.
 */
const FEATURE = 'classes.manage';

export async function createScheduleSlot(
  client: DbClient,
  ctx: AuthContext,
  input: CreateScheduleSlotInput,
) {
  assertCan(ctx, 'create', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(scheduleSlots)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime || null,
        note: input.note ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

/** Slots da agenda semanal (com nome da matéria), ordenados por dia e horário. */
export async function listScheduleSlots(client: DbClient, ctx: AuthContext, classId?: string) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, (tx) => {
    const q = tx
      .select({
        id: scheduleSlots.id,
        classId: scheduleSlots.classId,
        subjectId: scheduleSlots.subjectId,
        subjectName: subjects.name,
        weekday: scheduleSlots.weekday,
        startTime: scheduleSlots.startTime,
        endTime: scheduleSlots.endTime,
        note: scheduleSlots.note,
      })
      .from(scheduleSlots)
      .leftJoin(subjects, eq(subjects.id, scheduleSlots.subjectId))
      .orderBy(asc(scheduleSlots.weekday), asc(scheduleSlots.startTime));
    return classId ? q.where(eq(scheduleSlots.classId, classId)) : q;
  });
}

export async function deleteScheduleSlot(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'lesson');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(scheduleSlots).where(eq(scheduleSlots.id, id)),
  );
}

// --- Exceções/alterações pontuais (item 7) -----------------------------------
export async function createScheduleException(
  client: DbClient,
  ctx: AuthContext,
  input: CreateScheduleExceptionInput,
) {
  assertCan(ctx, 'create', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(scheduleExceptions)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        date: input.date,
        note: input.note,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listScheduleExceptions(client: DbClient, ctx: AuthContext, classId?: string) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, (tx) => {
    const q = tx.select().from(scheduleExceptions).orderBy(desc(scheduleExceptions.date));
    return classId ? q.where(eq(scheduleExceptions.classId, classId)) : q;
  });
}

export async function deleteScheduleException(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'lesson');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(scheduleExceptions).where(eq(scheduleExceptions.id, id)),
  );
}
