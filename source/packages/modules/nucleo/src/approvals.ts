import { randomBytes } from 'node:crypto';

import type { AuthContext } from '@on-education/auth';
import { approvals, type DbClient, tenants } from '@on-education/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

export interface CreateApprovalInput {
  kind?: string; // despesa | saida | outro
  title: string;
  detail?: string | null;
  amountCents?: number | null;
  requestedByName?: string | null;
}

/** Cria um pedido de aprovação e gera o token do link público. Guardado por isGestao na página. */
export async function createApproval(client: DbClient, ctx: AuthContext, input: CreateApprovalInput) {
  const token = randomBytes(24).toString('base64url');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(approvals)
      .values({
        tenantId: ctx.tenantId,
        kind: input.kind ?? 'despesa',
        title: input.title,
        detail: input.detail ?? null,
        amountCents: input.amountCents ?? null,
        token,
        requestedByName: input.requestedByName ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listApprovals(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(approvals)
      .where(isNull(approvals.deletedAt))
      .orderBy(desc(approvals.createdAt)),
  );
}

/** Busca pelo token, para a PÁGINA PÚBLICA de decisão (aprovador sem login). Server-only. */
export async function getApprovalByToken(client: DbClient, token: string) {
  const rows = await client.db
    .select({
      id: approvals.id,
      kind: approvals.kind,
      title: approvals.title,
      detail: approvals.detail,
      amountCents: approvals.amountCents,
      status: approvals.status,
      requestedByName: approvals.requestedByName,
      decidedByName: approvals.decidedByName,
      decisionReason: approvals.decisionReason,
      tenantName: tenants.name,
    })
    .from(approvals)
    .leftJoin(tenants, eq(tenants.id, approvals.tenantId))
    .where(eq(approvals.token, token));
  return rows[0] ?? null;
}

/** Decide um pedido pendente (idempotente: só age em 'pending'). */
export async function decideApproval(
  client: DbClient,
  token: string,
  decision: 'approved' | 'rejected',
  reason?: string | null,
  byName?: string | null,
) {
  await client.db
    .update(approvals)
    .set({
      status: decision,
      decisionReason: reason ?? null,
      decidedByName: byName ?? null,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(approvals.token, token), eq(approvals.status, 'pending')));
}
