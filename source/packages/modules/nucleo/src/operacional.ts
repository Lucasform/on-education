import type { AuthContext } from '@on-education/auth';
import { type DbClient, gateLogs, libraryItems, libraryLoans } from '@on-education/db';
import { desc, eq, isNull } from 'drizzle-orm';

// ---------------- Biblioteca ----------------

export async function createLibraryItem(
  client: DbClient,
  ctx: AuthContext,
  input: { title: string; author?: string | null; code?: string | null },
) {
  const title = (input.title ?? '').trim();
  if (!title) throw new Error('Informe o título.');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(libraryItems).values({
      tenantId: ctx.tenantId,
      title,
      author: input.author || null,
      code: input.code || null,
      createdBy: ctx.userId,
    }),
  );
}

export async function listLibraryItems(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(libraryItems)
      .where(isNull(libraryItems.deletedAt))
      .orderBy(desc(libraryItems.createdAt))
      .limit(500),
  );
}

export async function deleteLibraryItem(client: DbClient, ctx: AuthContext, id: string) {
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(libraryItems).set({ deletedAt: new Date() }).where(eq(libraryItems.id, id)),
  );
}

export async function loanLibraryItem(
  client: DbClient,
  ctx: AuthContext,
  input: { itemId: string; borrowerName: string; studentId?: string | null; dueDate?: string | null },
) {
  const borrower = (input.borrowerName ?? '').trim();
  if (!input.itemId || !borrower) throw new Error('Item e nome de quem pega são obrigatórios.');
  return client.withTenant(ctx.tenantId, async (tx) => {
    await tx.insert(libraryLoans).values({
      tenantId: ctx.tenantId,
      itemId: input.itemId,
      borrowerName: borrower,
      studentId: input.studentId || null,
      dueDate: input.dueDate || null,
      createdBy: ctx.userId,
    });
    await tx
      .update(libraryItems)
      .set({ status: 'emprestado', updatedAt: new Date() })
      .where(eq(libraryItems.id, input.itemId));
  });
}

export async function returnLibraryLoan(client: DbClient, ctx: AuthContext, loanId: string) {
  return client.withTenant(ctx.tenantId, async (tx) => {
    const [loan] = await tx
      .update(libraryLoans)
      .set({ returnedAt: new Date(), updatedAt: new Date() })
      .where(eq(libraryLoans.id, loanId))
      .returning({ itemId: libraryLoans.itemId });
    if (loan)
      await tx
        .update(libraryItems)
        .set({ status: 'disponivel', updatedAt: new Date() })
        .where(eq(libraryItems.id, loan.itemId));
  });
}

export async function listLibraryLoans(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        id: libraryLoans.id,
        itemId: libraryLoans.itemId,
        borrowerName: libraryLoans.borrowerName,
        loanedAt: libraryLoans.loanedAt,
        dueDate: libraryLoans.dueDate,
        returnedAt: libraryLoans.returnedAt,
        itemTitle: libraryItems.title,
      })
      .from(libraryLoans)
      .leftJoin(libraryItems, eq(libraryItems.id, libraryLoans.itemId))
      .where(isNull(libraryLoans.deletedAt))
      .orderBy(desc(libraryLoans.loanedAt))
      .limit(300),
  );
}

// ---------------- Portaria ----------------

export async function logGate(
  client: DbClient,
  ctx: AuthContext,
  input: { personName: string; kind?: string; direction?: string; studentId?: string | null; note?: string | null },
) {
  const personName = (input.personName ?? '').trim();
  if (!personName) throw new Error('Informe o nome.');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(gateLogs).values({
      tenantId: ctx.tenantId,
      personName,
      kind: input.kind || 'visitante',
      direction: input.direction === 'saida' ? 'saida' : 'entrada',
      studentId: input.studentId || null,
      note: input.note || null,
      createdBy: ctx.userId,
    }),
  );
}

export async function listGateLogs(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(gateLogs)
      .where(isNull(gateLogs.deletedAt))
      .orderBy(desc(gateLogs.at))
      .limit(300),
  );
}

export async function deleteGateLog(client: DbClient, ctx: AuthContext, id: string) {
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(gateLogs).set({ deletedAt: new Date() }).where(eq(gateLogs.id, id)),
  );
}
