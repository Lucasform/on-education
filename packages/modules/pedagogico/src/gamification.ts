import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, studentPoints } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

/**
 * Gamificação (Frente 4b): pontos por aluno (ledger) + medalha derivada do total.
 * Reusa a checagem do banco de atividades (`activities.bank`) — quem gerencia conteúdo do
 * aluno pode premiar. Checagem tripla + RLS. Soft delete.
 */
const FEATURE = 'activities.bank' as const;

export interface Medal {
  tier: 'nenhuma' | 'bronze' | 'prata' | 'ouro';
  emoji: string;
  /** Pontos que faltam para a próxima medalha (0 se no topo). */
  toNext: number;
}

/** Faixas de medalha por total de pontos. Personalizável depois (config por escola). */
export function medalFor(total: number): Medal {
  if (total >= 300) return { tier: 'ouro', emoji: '🥇', toNext: 0 };
  if (total >= 150) return { tier: 'prata', emoji: '🥈', toNext: 300 - total };
  if (total >= 50) return { tier: 'bronze', emoji: '🥉', toNext: 150 - total };
  return { tier: 'nenhuma', emoji: '⭐', toNext: 50 - total };
}

/** Premia um aluno com pontos (positivos) + motivo. Decisão do professor. */
export async function awardPoints(
  client: DbClient,
  ctx: AuthContext,
  input: { studentId: string; points: number; reason?: string },
) {
  assertCan(ctx, 'create', 'activity');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  const pts = Math.max(1, Math.min(1000, Math.round(input.points)));
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(studentPoints)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        points: pts,
        reason: input.reason?.slice(0, 300) ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

/** Premiações recentes de um aluno (mais novas primeiro). */
export async function listStudentPoints(client: DbClient, ctx: AuthContext, studentId: string) {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(studentPoints)
      .where(and(eq(studentPoints.studentId, studentId), isNull(studentPoints.deletedAt)))
      .orderBy(desc(studentPoints.createdAt)),
  );
}

/** Total de pontos por aluno do tenant (Map studentId → total). Para ficha e ranking. */
export async function pointsTotals(
  client: DbClient,
  ctx: AuthContext,
): Promise<Map<string, number>> {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select({
        studentId: studentPoints.studentId,
        total: sql<number>`coalesce(sum(${studentPoints.points}), 0)`,
      })
      .from(studentPoints)
      .where(isNull(studentPoints.deletedAt))
      .groupBy(studentPoints.studentId);
    return new Map(rows.map((r) => [r.studentId, Number(r.total)]));
  });
}

/** Remove uma premiação (soft delete). */
export async function deleteStudentPoint(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'activity');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(studentPoints).set({ deletedAt: new Date() }).where(eq(studentPoints.id, id)),
  );
}
