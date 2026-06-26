import type { AuthContext } from '@on-education/auth';
import { type DbClient, users, workRequests } from '@on-education/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

const GESTAO = ['owner', 'director', 'vice_director', 'coordinator'];

/** Diretoria/coordenação: quem pode analisar e resolver solicitações. */
export function isGestao(ctx: AuthContext): boolean {
  return ctx.roles.some((r) => GESTAO.includes(r));
}

// Field-level security do financeiro: valores em dinheiro só para quem responde pela tesouraria.
// Coordenação faz gestão pedagógica mas não vê valores; professor/monitor nunca veem.
const FINANCE_ROLES = ['owner', 'director', 'vice_director', 'secretary', 'treasurer'];

/** Pode ver VALORES financeiros (mensalidades, a receber, resultado). Mascarar para os demais. */
export function canSeeFinanceValues(ctx: AuthContext): boolean {
  return ctx.roles.some((r) => FINANCE_ROLES.includes(r));
}

export interface CreateWorkRequestInput {
  type: string; // ocorrencia | servico | impressao | comparecimento
  title: string;
  body?: string;
  studentId?: string | null;
  classId?: string | null;
  activityId?: string | null;
  copies?: number | null;
  requestedByName?: string | null;
}

const TIPOS = new Set(['ocorrencia', 'servico', 'impressao', 'comparecimento']);

/** Qualquer membro abre uma solicitação (vai para a coluna "Enviada"). */
export async function createWorkRequest(
  client: DbClient,
  ctx: AuthContext,
  input: CreateWorkRequestInput,
) {
  const type = TIPOS.has(input.type) ? input.type : 'servico';
  const title = (input.title ?? '').trim() || 'Solicitação';
  let requestedByName = input.requestedByName ?? null;
  if (!requestedByName) {
    const u = await client.db
      .select({ n: users.fullName, e: users.email })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);
    requestedByName = u[0]?.n ?? u[0]?.e ?? null;
  }
  return client.withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .insert(workRequests)
      .values({
        tenantId: ctx.tenantId,
        type,
        title,
        body: (input.body ?? '').trim(),
        studentId: input.studentId || null,
        classId: input.classId || null,
        activityId: input.activityId || null,
        copies: input.copies ?? null,
        requestedByName,
        createdBy: ctx.userId,
      })
      .returning({ id: workRequests.id });
    return row;
  });
}

/** Todas as solicitações (visão da gestão / Kanban). */
export async function listWorkRequests(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(workRequests)
      .where(isNull(workRequests.deletedAt))
      .orderBy(desc(workRequests.createdAt))
      .limit(300),
  );
}

/** Apenas as solicitações abertas pelo próprio usuário (visão do professor). */
export async function listMyWorkRequests(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(workRequests)
      .where(and(eq(workRequests.createdBy, ctx.userId), isNull(workRequests.deletedAt)))
      .orderBy(desc(workRequests.createdAt))
      .limit(200),
  );
}

/** Move a solicitação de coluna (gestão). Ao resolver, grava a conclusão. */
export async function setWorkRequestStatus(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  status: 'enviada' | 'em_analise' | 'resolvida',
  resolution?: string | null,
) {
  if (!isGestao(ctx)) throw new Error('Sem permissão para analisar solicitações.');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(workRequests)
      .set({
        status,
        resolution: resolution !== undefined ? resolution : undefined,
        resolvedAt: status === 'resolvida' ? new Date() : null,
        resolvedBy: status === 'resolvida' ? ctx.userId : null,
        updatedAt: new Date(),
      })
      .where(eq(workRequests.id, id)),
  );
}

export async function deleteWorkRequest(client: DbClient, ctx: AuthContext, id: string) {
  // Quem abriu pode cancelar; a gestão pode excluir qualquer uma.
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(workRequests)
      .set({ deletedAt: new Date() })
      .where(
        isGestao(ctx)
          ? eq(workRequests.id, id)
          : and(eq(workRequests.id, id), eq(workRequests.createdBy, ctx.userId)),
      ),
  );
}
