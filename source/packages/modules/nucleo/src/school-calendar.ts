import { assertCan, type AuthContext } from '@on-education/auth';
import { schoolCalendarEvents, tenants, type DbClient } from '@on-education/db';
import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';

export type CalendarEventType = 'holiday' | 'commemorative' | 'no_school' | 'school_day';

/** Lista eventos do calendário de um tenant para um intervalo de datas. */
export async function listCalendarEvents(
  client: DbClient,
  ctx: AuthContext,
  from?: string,
  to?: string,
) {
  assertCan(ctx, 'read', 'setting');
  return client.withTenant(ctx.tenantId, (tx) => {
    let q = tx
      .select()
      .from(schoolCalendarEvents)
      .where(isNull(schoolCalendarEvents.deletedAt))
      .orderBy(asc(schoolCalendarEvents.date));
    if (from || to) {
      const conditions = [isNull(schoolCalendarEvents.deletedAt)];
      if (from) conditions.push(gte(schoolCalendarEvents.date, from));
      if (to) conditions.push(lte(schoolCalendarEvents.date, to));
      return tx
        .select()
        .from(schoolCalendarEvents)
        .where(and(...conditions))
        .orderBy(asc(schoolCalendarEvents.date));
    }
    return q;
  });
}

/** Cria um evento no calendário escolar. */
export async function createCalendarEvent(
  client: DbClient,
  ctx: AuthContext,
  input: { date: string; name: string; type: string; recurring?: boolean },
) {
  assertCan(ctx, 'update', 'setting');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(schoolCalendarEvents)
      .values({
        tenantId: ctx.tenantId,
        date: input.date,
        name: input.name,
        type: input.type,
        recurring: input.recurring ?? false,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

/** Remove um evento do calendário (soft-delete). */
export async function deleteCalendarEvent(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'setting');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(schoolCalendarEvents)
      .set({ deletedAt: new Date() })
      .where(and(eq(schoolCalendarEvents.id, id), eq(schoolCalendarEvents.tenantId, ctx.tenantId))),
  );
}

/** Atualiza as datas do ano letivo do tenant. */
export async function setSchoolYear(
  client: DbClient,
  ctx: AuthContext,
  schoolYearStart: string | null,
  schoolYearEnd: string | null,
) {
  assertCan(ctx, 'update', 'setting');
  await client.db
    .update(tenants)
    .set({ schoolYearStart, schoolYearEnd })
    .where(eq(tenants.id, ctx.tenantId));
}

/** Retorna configuração do ano letivo do tenant. */
export async function getSchoolYear(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'setting');
  const rows = await client.db
    .select({ schoolYearStart: tenants.schoolYearStart, schoolYearEnd: tenants.schoolYearEnd })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1);
  return rows[0] ?? { schoolYearStart: null, schoolYearEnd: null };
}

/**
 * Calcula o total de dias letivos entre início e fim do ano letivo,
 * excluindo finais de semana (sab/dom) e eventos marcados como `holiday` ou `no_school`.
 */
export function calculateSchoolDays(
  startDate: string,
  endDate: string,
  nonSchoolDates: Set<string>,
): { total: number; passed: number; remaining: number } {
  const start = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate + 'T12:00:00Z');
  const today = new Date();

  let total = 0;
  let passed = 0;
  const cur = new Date(start);

  while (cur <= end) {
    const dow = cur.getUTCDay();
    const dateStr = cur.toISOString().slice(0, 10);
    const isWeekend = dow === 0 || dow === 6;
    const isNonSchool = nonSchoolDates.has(dateStr);

    if (!isWeekend && !isNonSchool) {
      total++;
      if (cur <= today) passed++;
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return { total, passed, remaining: total - passed };
}
