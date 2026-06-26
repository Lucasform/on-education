import { type DbClient, errorLogs, tenants, users } from '@on-education/db';
import { desc, eq, sql } from 'drizzle-orm';

export interface RecordErrorInput {
  tenantId?: string | null;
  userId?: string | null;
  /** Curto e estável, para agrupar (ex.: gerar_atividade, gerar_conteudo, correcao). */
  context: string;
  message: string;
  detail?: string | null;
  durationMs?: number | null;
}

/**
 * Registra um erro operacional para o painel do admin. BEST-EFFORT: nunca lança, porque o
 * logging do erro não pode, ele mesmo, derrubar o fluxo do usuário. Escreve via conexão de
 * serviço (`client.db`).
 */
export async function recordError(client: DbClient, input: RecordErrorInput): Promise<void> {
  try {
    await client.db.insert(errorLogs).values({
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      context: input.context.slice(0, 80),
      message: (input.message || 'Erro desconhecido').slice(0, 2000),
      detail: input.detail ? input.detail.slice(0, 4000) : null,
      durationMs: input.durationMs ?? null,
    });
  } catch {
    // silencioso de propósito
  }
}

/** Lista de erros para o painel admin (cross-tenant, conexão de serviço). */
export async function listErrors(client: DbClient, opts: { limit?: number } = {}) {
  return client.db
    .select({
      id: errorLogs.id,
      context: errorLogs.context,
      message: errorLogs.message,
      durationMs: errorLogs.durationMs,
      createdAt: errorLogs.createdAt,
      tenantId: errorLogs.tenantId,
      tenantName: tenants.name,
      userEmail: users.email,
      userName: users.fullName,
    })
    .from(errorLogs)
    .leftJoin(tenants, eq(tenants.id, errorLogs.tenantId))
    .leftJoin(users, eq(users.id, errorLogs.userId))
    .orderBy(desc(errorLogs.createdAt))
    .limit(opts.limit ?? 200);
}

/** Resumo por contexto (quantos erros de cada tipo), para o admin priorizar melhorias. */
export async function errorStats(client: DbClient) {
  return client.db
    .select({ context: errorLogs.context, total: sql<number>`count(*)::int` })
    .from(errorLogs)
    .groupBy(errorLogs.context)
    .orderBy(sql`count(*) desc`);
}
