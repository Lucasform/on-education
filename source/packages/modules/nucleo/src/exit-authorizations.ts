import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, exitAuthorizations } from '@on-education/db';
import { desc, eq, isNull } from 'drizzle-orm';

export async function listExitAuthorizations(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(exitAuthorizations)
      .where(isNull(exitAuthorizations.deletedAt))
      .orderBy(desc(exitAuthorizations.date), desc(exitAuthorizations.createdAt)),
  );
}

export async function createExitAuthorization(
  client: DbClient,
  ctx: AuthContext,
  input: {
    studentId: string;
    date: string;
    time?: string;
    reason: string;
    authorizedByName?: string;
  },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(exitAuthorizations)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        date: input.date,
        time: input.time ?? null,
        reason: input.reason,
        authorizedByName: input.authorizedByName ?? null,
        status: 'pending',
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function updateExitAuthorizationStatus(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  status: 'approved' | 'denied' | 'executed',
) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(exitAuthorizations)
      .set({ status, updatedAt: new Date() })
      .where(eq(exitAuthorizations.id, id)),
  );
}

export async function deleteExitAuthorization(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(exitAuthorizations)
      .set({ deletedAt: new Date() })
      .where(eq(exitAuthorizations.id, id)),
  );
}
