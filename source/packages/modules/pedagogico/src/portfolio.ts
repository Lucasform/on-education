import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, portfolioEntries } from '@on-education/db';
import type { CreatePortfolioEntryInput } from '@on-education/validation';
import { desc, eq } from 'drizzle-orm';

/** Portfólio do aluno (Pedagógico). Checagem tripla; gate em `activities.bank`. */
import { assertEntitled } from '@on-education/module-nucleo';

export async function createPortfolioEntry(
  client: DbClient,
  ctx: AuthContext,
  input: CreatePortfolioEntryInput,
) {
  assertCan(ctx, 'create', 'portfolio');
  await assertEntitled(client, ctx.tenantId, 'activities.bank');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(portfolioEntries)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        title: input.title,
        description: input.description ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listPortfolioEntries(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'portfolio');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(portfolioEntries).orderBy(desc(portfolioEntries.createdAt)),
  );
}

/** Portfólio de UM aluno (evita varrer o portfólio inteiro do tenant na ficha). */
export async function listPortfolioForStudent(
  client: DbClient,
  ctx: AuthContext,
  studentId: string,
) {
  assertCan(ctx, 'read', 'portfolio');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(portfolioEntries)
      .where(eq(portfolioEntries.studentId, studentId))
      .orderBy(desc(portfolioEntries.createdAt)),
  );
}
