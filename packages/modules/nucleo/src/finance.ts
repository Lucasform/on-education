import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, invoices } from '@on-education/db';
import type { CreateInvoiceInput } from '@on-education/validation';
import { asc, desc, eq, isNull } from 'drizzle-orm';

/**
 * Financeiro 2.a (item 5.1): controle interno de cobranças por aluno/responsável.
 * Dado financeiro sensível: só gestão escreve (RBAC `invoice` exige papel de gestão);
 * "vencido" é derivado na UI (aberto + venc < hoje). Soft delete. Sem PSP nesta fase.
 */
export async function createInvoice(client: DbClient, ctx: AuthContext, input: CreateInvoiceInput) {
  assertCan(ctx, 'create', 'invoice');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(invoices)
      .values({
        tenantId: ctx.tenantId,
        guardianId: input.guardianId ?? null,
        studentId: input.studentId ?? null,
        competencia: input.competencia,
        description: input.description,
        amountCents: Math.round(input.amount * 100),
        dueDate: input.dueDate,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listInvoices(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'invoice');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(invoices)
      .where(isNull(invoices.deletedAt))
      .orderBy(desc(invoices.competencia), asc(invoices.dueDate)),
  );
}

export async function markInvoicePaid(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'invoice');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(invoices)
      .set({ status: 'pago', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, id)),
  );
}

export async function reopenInvoice(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'invoice');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(invoices)
      .set({ status: 'aberto', paidAt: null, updatedAt: new Date() })
      .where(eq(invoices.id, id)),
  );
}

export async function deleteInvoice(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'invoice');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(invoices).set({ deletedAt: new Date() }).where(eq(invoices.id, id)),
  );
}
