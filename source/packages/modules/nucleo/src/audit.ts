import { assertCan, type AuthContext } from '@on-education/auth';
import { auditLog, type DbClient } from '@on-education/db';
import { desc, eq } from 'drizzle-orm';

/**
 * Trilha de auditoria (Frente 16 / Master Spec §6.3): registra operações sensíveis
 * (alterar nota, excluir aluno/turma, mexer no financeiro) para a escola poder revisar.
 * Append-only na prática. RLS por tenant. `metadata` guarda um resumo legível + ids.
 */
export async function recordAudit(
  client: DbClient,
  ctx: AuthContext,
  input: { action: string; resource: string; metadata?: Record<string, unknown> },
): Promise<void> {
  // Auditoria nunca pode derrubar a operação principal: falha vira no-op silencioso.
  try {
    await client.withTenant(ctx.tenantId, (tx) =>
      tx.insert(auditLog).values({
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: input.action,
        resource: input.resource,
        metadata: input.metadata ?? null,
      }),
    );
  } catch {
    // ignora: registrar auditoria é best-effort
  }
}

/** Últimos eventos de auditoria do tenant (mais recentes primeiro). Gestão da escola. */
export async function listAudit(client: DbClient, ctx: AuthContext, limit = 100) {
  assertCan(ctx, 'read', 'tenant_settings');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, ctx.tenantId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit),
  );
}
