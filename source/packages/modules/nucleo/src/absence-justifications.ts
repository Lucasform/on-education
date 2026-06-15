import { assertCan, type AuthContext } from '@on-education/auth';
import { absenceJustifications, type DbClient } from '@on-education/db';
import { desc, eq, isNull } from 'drizzle-orm';

export async function listAbsenceJustifications(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(absenceJustifications)
      .where(isNull(absenceJustifications.deletedAt))
      .orderBy(desc(absenceJustifications.date), desc(absenceJustifications.createdAt)),
  );
}

export async function createAbsenceJustification(
  client: DbClient,
  ctx: AuthContext,
  input: {
    studentId: string;
    date: string;
    reason: string;
    submittedByName?: string;
  },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(absenceJustifications)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        date: input.date,
        reason: input.reason,
        submittedByName: input.submittedByName ?? null,
        status: 'pending',
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function reviewAbsenceJustification(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  status: 'approved' | 'denied',
  reviewNote?: string,
) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(absenceJustifications)
      .set({
        status,
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(absenceJustifications.id, id)),
  );
}
