import { assertCan, type AuthContext } from '@on-education/auth';
import { classSubjects, type DbClient, subjects } from '@on-education/db';
import type { LinkClassSubjectInput } from '@on-education/validation';
import { and, eq } from 'drizzle-orm';

/**
 * Matérias da turma (item 3.2): vínculo N:N turma↔disciplina (grade curricular).
 * Reusa a permissão de `class` (gestão + professor da org). Checagem tripla: RBAC + RLS.
 */
export async function linkClassSubject(
  client: DbClient,
  ctx: AuthContext,
  input: LinkClassSubjectInput,
) {
  assertCan(ctx, 'update', 'class');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(classSubjects)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        subjectId: input.subjectId,
        createdBy: ctx.userId,
      })
      .onConflictDoNothing({
        target: [classSubjects.tenantId, classSubjects.classId, classSubjects.subjectId],
      })
      .returning();
    return rows[0] ?? null;
  });
}

/** Matérias vinculadas a uma turma, com o nome da disciplina resolvido. */
export async function listClassSubjects(client: DbClient, ctx: AuthContext, classId: string) {
  assertCan(ctx, 'read', 'class');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        id: classSubjects.id,
        subjectId: classSubjects.subjectId,
        subjectName: subjects.name,
      })
      .from(classSubjects)
      .leftJoin(subjects, eq(subjects.id, classSubjects.subjectId))
      .where(eq(classSubjects.classId, classId)),
  );
}

export async function unlinkClassSubject(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'class');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(classSubjects).where(and(eq(classSubjects.id, id))),
  );
}
