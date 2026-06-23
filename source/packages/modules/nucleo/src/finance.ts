import { assertCan, type AuthContext } from '@on-education/auth';
import {
  type DbClient,
  financeExpenses,
  invoices,
  studentGuardians,
  students,
} from '@on-education/db';
import type { CreateInvoiceInput, GenerateMonthlyInvoicesInput } from '@on-education/validation';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';

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

/**
 * Recorrência: gera uma cobrança da competência para cada aluso ativo (vinculada ao
 * responsável financeiro, se houver), pulando quem já tem cobrança naquela competência.
 * Idempotente por (aluno, competência). Retorna quantas foram criadas.
 */
export async function generateMonthlyInvoices(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateMonthlyInvoicesInput,
) {
  assertCan(ctx, 'create', 'invoice');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const [alunos, vinculos, existentes] = await Promise.all([
      tx.select({ id: students.id }).from(students).where(isNull(students.deletedAt)),
      tx
        .select({ studentId: studentGuardians.studentId, guardianId: studentGuardians.guardianId })
        .from(studentGuardians)
        .where(eq(studentGuardians.isFinancial, true)),
      tx
        .select({ studentId: invoices.studentId })
        .from(invoices)
        .where(and(eq(invoices.competencia, input.competencia), isNull(invoices.deletedAt))),
    ]);
    const financeiroDe = new Map(vinculos.map((v) => [v.studentId, v.guardianId]));
    const jaCobrado = new Set(existentes.map((e) => e.studentId).filter(Boolean));
    const novos = alunos
      .filter((a) => !jaCobrado.has(a.id))
      .map((a) => ({
        tenantId: ctx.tenantId,
        studentId: a.id,
        guardianId: financeiroDe.get(a.id) ?? null,
        competencia: input.competencia,
        description: input.description || 'Mensalidade',
        amountCents: Math.round(input.amount * 100),
        dueDate: input.dueDate,
        createdBy: ctx.userId,
      }));
    if (novos.length === 0) return 0;
    await tx.insert(invoices).values(novos);
    return novos.length;
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

// --- Despesas (para fluxo de caixa e DRE simples) ---

export interface CreateExpenseInput {
  description: string;
  category: string;
  amount: number; // em reais
  competencia: string; // 'YYYY-MM'
  dueDate?: string | null;
  status?: 'pago' | 'aberto';
}

export async function createExpense(client: DbClient, ctx: AuthContext, input: CreateExpenseInput) {
  assertCan(ctx, 'create', 'invoice');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const status = input.status === 'aberto' ? 'aberto' : 'pago';
    const rows = await tx
      .insert(financeExpenses)
      .values({
        tenantId: ctx.tenantId,
        description: input.description,
        category: input.category || 'outros',
        amountCents: Math.round((input.amount || 0) * 100),
        competencia: input.competencia,
        dueDate: input.dueDate || null,
        status,
        paidAt: status === 'pago' ? new Date() : null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listExpenses(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'invoice');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(financeExpenses)
      .where(isNull(financeExpenses.deletedAt))
      .orderBy(desc(financeExpenses.competencia)),
  );
}

export async function markExpensePaid(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'invoice');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(financeExpenses)
      .set({ status: 'pago', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(financeExpenses.id, id)),
  );
}

export async function deleteExpense(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'invoice');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(financeExpenses).set({ deletedAt: new Date() }).where(eq(financeExpenses.id, id)),
  );
}

export interface FinanceSummary {
  receitasPagas: number;
  despesasPagas: number;
  resultado: number;
  aReceber: number;
  aPagar: number;
  porMes: { competencia: string; receita: number; despesa: number; saldo: number }[];
}

/** Resumo financeiro: DRE simples (receita - despesa) + fluxo de caixa por mês. Valores em reais. */
export async function getFinanceSummary(client: DbClient, ctx: AuthContext): Promise<FinanceSummary> {
  assertCan(ctx, 'read', 'invoice');
  const [inv, exp] = await Promise.all([listInvoices(client, ctx), listExpenses(client, ctx)]);
  const meses = new Map<string, { receita: number; despesa: number }>();
  const bump = (mes: string, campo: 'receita' | 'despesa', cents: number) => {
    const m = meses.get(mes) ?? { receita: 0, despesa: 0 };
    m[campo] += cents;
    meses.set(mes, m);
  };
  let receitasPagas = 0;
  let despesasPagas = 0;
  let aReceber = 0;
  let aPagar = 0;
  for (const i of inv) {
    if (i.status === 'pago') {
      receitasPagas += i.amountCents;
      bump(i.competencia, 'receita', i.amountCents);
    } else if (i.status === 'aberto') {
      aReceber += i.amountCents;
    }
  }
  for (const e of exp) {
    if (e.status === 'pago') {
      despesasPagas += e.amountCents;
      bump(e.competencia, 'despesa', e.amountCents);
    } else {
      aPagar += e.amountCents;
    }
  }
  const porMes = [...meses.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)
    .map(([competencia, v]) => ({
      competencia,
      receita: v.receita / 100,
      despesa: v.despesa / 100,
      saldo: (v.receita - v.despesa) / 100,
    }));
  return {
    receitasPagas: receitasPagas / 100,
    despesasPagas: despesasPagas / 100,
    resultado: (receitasPagas - despesasPagas) / 100,
    aReceber: aReceber / 100,
    aPagar: aPagar / 100,
    porMes,
  };
}
