import { type DbClient, guardians, invoices, studentGuardians } from '@on-education/db';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';

/**
 * Camada de pagamento online da MENSALIDADE (família -> escola), agnóstica de PSP.
 * Funções de SERVIÇO (sem AuthContext): usadas pelo webhook (baixa automática) e pela
 * action do portal (persistir a cobrança gerada). O provider em si (Asaas/Iugu) vive na
 * camada de app (apps/web/src/server/payments.ts); aqui só fazemos DB + validação de posse.
 */

export interface SetInvoiceChargeInput {
  provider: string;
  externalChargeId: string;
  paymentMethod: string;
  paymentUrl?: string | null;
  pixCode?: string | null;
  boletoLine?: string | null;
}

/** Persiste os dados da cobrança gerada no PSP na fatura. Marca charged_at = agora. */
export async function setInvoiceCharge(
  client: DbClient,
  tenantId: string,
  invoiceId: string,
  input: SetInvoiceChargeInput,
) {
  await client.withTenant(tenantId, (tx) =>
    tx
      .update(invoices)
      .set({
        provider: input.provider,
        externalChargeId: input.externalChargeId,
        paymentMethod: input.paymentMethod,
        paymentUrl: input.paymentUrl ?? null,
        pixCode: input.pixCode ?? null,
        boletoLine: input.boletoLine ?? null,
        chargedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId)),
  );
}

/** Baixa automática a partir do id da cobrança no PSP (chamada pelo webhook). Idempotente. */
export async function markInvoicePaidByExternalCharge(
  client: DbClient,
  tenantId: string,
  externalChargeId: string,
) {
  await client.withTenant(tenantId, (tx) =>
    tx
      .update(invoices)
      .set({ status: 'pago', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.externalChargeId, externalChargeId)),
  );
}

/**
 * Webhook não conhece o tenant. Descobre o tenant da fatura pelo id externo da cobrança
 * usando client.db (bypass de RLS, papel owner). Retorna null se não houver fatura.
 */
export async function findInvoiceTenantByExternalCharge(
  client: DbClient,
  externalChargeId: string,
): Promise<string | null> {
  const rows = await client.db
    .select({ tenantId: invoices.tenantId })
    .from(invoices)
    .where(eq(invoices.externalChargeId, externalChargeId))
    .limit(1);
  return rows[0]?.tenantId ?? null;
}

/** Dados de contato do responsável usados como pagador (payer) ao gerar a cobrança. */
export async function getGuardianContact(
  client: DbClient,
  tenantId: string,
  guardianId: string,
): Promise<{ fullName: string; email: string | null } | null> {
  return client.withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ fullName: guardians.fullName, email: guardians.email })
      .from(guardians)
      .where(eq(guardians.id, guardianId))
      .limit(1);
    return rows[0] ?? null;
  });
}

/**
 * Valida que a fatura pertence a este responsável: ou está diretamente vinculada a ele,
 * ou é de um aluno do qual ele é responsável (student_guardians). Lança se não pertencer.
 * Retorna os dados mínimos da fatura necessários para gerar a cobrança.
 */
export async function assertGuardianOwnsInvoice(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  invoiceId: string,
): Promise<{
  id: string;
  amountCents: number;
  description: string;
  dueDate: string;
  status: string;
}> {
  return client.withTenant(tenantId, async (tx) => {
    const vinc = await tx
      .select({ studentId: studentGuardians.studentId })
      .from(studentGuardians)
      .where(eq(studentGuardians.guardianId, guardianId));
    const sids = vinc.map((v) => v.studentId);

    const owns =
      sids.length > 0
        ? or(eq(invoices.guardianId, guardianId), inArray(invoices.studentId, sids))
        : eq(invoices.guardianId, guardianId);

    const rows = await tx
      .select({
        id: invoices.id,
        amountCents: invoices.amountCents,
        description: invoices.description,
        dueDate: invoices.dueDate,
        status: invoices.status,
      })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), owns, isNull(invoices.deletedAt)))
      .limit(1);

    const inv = rows[0];
    if (!inv) throw new Error('Fatura não vinculada a este responsável.');
    return inv;
  });
}
