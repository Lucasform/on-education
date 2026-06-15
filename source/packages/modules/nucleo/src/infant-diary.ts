import { assertCan, type AuthContext } from '@on-education/auth';
import { infantDiaryEntries, type DbClient } from '@on-education/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

export async function listDiaryEntries(client: DbClient, ctx: AuthContext, studentId: string) {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(infantDiaryEntries)
      .where(
        and(
          eq(infantDiaryEntries.studentId, studentId),
          isNull(infantDiaryEntries.deletedAt),
        ),
      )
      .orderBy(desc(infantDiaryEntries.date)),
  );
}

export async function createDiaryEntry(
  client: DbClient,
  ctx: AuthContext,
  input: { studentId: string; date: string; category: string; content?: string },
) {
  assertCan(ctx, 'create', 'student');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(infantDiaryEntries)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        date: input.date,
        category: input.category,
        content: input.content ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function deleteDiaryEntry(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'student');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(infantDiaryEntries)
      .set({ deletedAt: new Date() })
      .where(eq(infantDiaryEntries.id, id)),
  );
}
