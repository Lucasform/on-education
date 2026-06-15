import { assertCan, type AuthContext } from '@on-education/auth';
import { classCouncils, councilRemarks, type DbClient, students } from '@on-education/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

export async function listCouncils(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(classCouncils)
      .where(isNull(classCouncils.deletedAt))
      .orderBy(desc(classCouncils.date)),
  );
}

export async function getCouncil(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(classCouncils)
      .where(and(eq(classCouncils.id, id), isNull(classCouncils.deletedAt)));
    return rows[0] ?? null;
  });
}

export async function createCouncil(
  client: DbClient,
  ctx: AuthContext,
  input: { classId: string; title: string; date: string },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(classCouncils)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        title: input.title,
        date: input.date,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function closeCouncil(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(classCouncils)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(eq(classCouncils.id, id)),
  );
}

export async function listCouncilRemarks(client: DbClient, ctx: AuthContext, councilId: string) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(councilRemarks)
      .where(and(eq(councilRemarks.councilId, councilId), isNull(councilRemarks.deletedAt))),
  );
}

export async function upsertCouncilRemark(
  client: DbClient,
  ctx: AuthContext,
  input: { councilId: string; studentId: string; remark?: string; recommendation?: string },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const existing = await tx
      .select()
      .from(councilRemarks)
      .where(
        and(
          eq(councilRemarks.councilId, input.councilId),
          eq(councilRemarks.studentId, input.studentId),
          isNull(councilRemarks.deletedAt),
        ),
      );
    if (existing[0]) {
      const rows = await tx
        .update(councilRemarks)
        .set({
          remark: input.remark ?? null,
          recommendation: input.recommendation ?? null,
          updatedAt: new Date(),
        })
        .where(eq(councilRemarks.id, existing[0].id))
        .returning();
      return rows[0]!;
    }
    const rows = await tx
      .insert(councilRemarks)
      .values({
        tenantId: ctx.tenantId,
        councilId: input.councilId,
        studentId: input.studentId,
        remark: input.remark ?? null,
        recommendation: input.recommendation ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listStudentsForCouncil(client: DbClient, ctx: AuthContext, classId: string) {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(students)
      .where(and(eq(students.classId, classId), isNull(students.deletedAt))),
  );
}
