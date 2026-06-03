import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, lessonPlans, subjects } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import type { CreateLessonPlanInput } from '@on-education/validation';
import { and, desc, eq, isNull } from 'drizzle-orm';

/**
 * Planejamento (itens 7.1/7.3): plano de aula, avaliação ou trabalho por turma/matéria.
 * Checagem tripla (RBAC `lesson` + entitlement `classes.manage` + RLS). Soft delete.
 */
const FEATURE = 'classes.manage';

export async function createLessonPlan(
  client: DbClient,
  ctx: AuthContext,
  input: CreateLessonPlanInput,
) {
  assertCan(ctx, 'create', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(lessonPlans)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        kind: input.kind,
        title: input.title,
        content: input.content ?? null,
        date: input.date ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

/** Planos (com nome da matéria), opcionalmente filtrados por turma. Mais recentes primeiro. */
export async function listLessonPlans(client: DbClient, ctx: AuthContext, classId?: string) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, (tx) => {
    const q = tx
      .select({
        id: lessonPlans.id,
        classId: lessonPlans.classId,
        subjectId: lessonPlans.subjectId,
        subjectName: subjects.name,
        kind: lessonPlans.kind,
        title: lessonPlans.title,
        content: lessonPlans.content,
        date: lessonPlans.date,
      })
      .from(lessonPlans)
      .leftJoin(subjects, eq(subjects.id, lessonPlans.subjectId))
      .where(
        classId
          ? and(eq(lessonPlans.classId, classId), isNull(lessonPlans.deletedAt))
          : isNull(lessonPlans.deletedAt),
      )
      .orderBy(desc(lessonPlans.createdAt));
    return q;
  });
}

export async function deleteLessonPlan(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'lesson');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(lessonPlans).set({ deletedAt: new Date() }).where(eq(lessonPlans.id, id)),
  );
}
