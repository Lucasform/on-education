import { assertCan, type AuthContext } from '@on-education/auth';
import {
  classes,
  type DbClient,
  memberships,
  subjects,
  teachingAssignments,
  users,
} from '@on-education/db';
import type { AssignTeachingInput } from '@on-education/validation';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * Vínculos do professor (item 17): membership ↔ turma ↔ matéria. Gestão institucional —
 * só papéis de gestão (owner/director/coordinator) criam/removem (RBAC). Leitura liberada.
 * Checagem tripla: RBAC (assertCan) + RLS (withTenant). Sem feature-gate próprio (faz parte
 * do plano de escola).
 */

/** Professores/membros do tenant (membership + dados do usuário). Para a tela de vínculos. */
export async function listTeachers(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'membership');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        membershipId: memberships.id,
        userId: memberships.userId,
        role: memberships.role,
        fullName: users.fullName,
        email: users.email,
      })
      .from(memberships)
      .leftJoin(users, eq(users.id, memberships.userId))
      .where(isNull(memberships.deletedAt)),
  );
}

export async function assignTeaching(
  client: DbClient,
  ctx: AuthContext,
  input: AssignTeachingInput,
) {
  assertCan(ctx, 'create', 'teaching_assignment');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(teachingAssignments)
      .values({
        tenantId: ctx.tenantId,
        membershipId: input.membershipId,
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        createdBy: ctx.userId,
      })
      .onConflictDoNothing({
        target: [
          teachingAssignments.tenantId,
          teachingAssignments.membershipId,
          teachingAssignments.classId,
          teachingAssignments.subjectId,
        ],
      })
      .returning();
    return rows[0] ?? null;
  });
}

/** Vínculos com nomes resolvidos (professor, turma, matéria) para exibição. */
export async function listTeachingAssignments(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'teaching_assignment');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        id: teachingAssignments.id,
        membershipId: teachingAssignments.membershipId,
        classId: teachingAssignments.classId,
        subjectId: teachingAssignments.subjectId,
        className: classes.name,
        subjectName: subjects.name,
        teacherName: users.fullName,
        teacherEmail: users.email,
      })
      .from(teachingAssignments)
      .leftJoin(classes, eq(classes.id, teachingAssignments.classId))
      .leftJoin(subjects, eq(subjects.id, teachingAssignments.subjectId))
      .leftJoin(memberships, eq(memberships.id, teachingAssignments.membershipId))
      .leftJoin(users, eq(users.id, memberships.userId))
      .where(isNull(teachingAssignments.deletedAt)),
  );
}

/** Matérias e turmas que um professor (membership) leciona. Base para diário/notas/faltas. */
export async function listAssignmentsForMembership(
  client: DbClient,
  ctx: AuthContext,
  membershipId: string,
) {
  assertCan(ctx, 'read', 'teaching_assignment');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(teachingAssignments)
      .where(
        and(
          eq(teachingAssignments.membershipId, membershipId),
          isNull(teachingAssignments.deletedAt),
        ),
      ),
  );
}

export async function removeTeachingAssignment(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'teaching_assignment');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(teachingAssignments)
      .set({ deletedAt: new Date() })
      .where(eq(teachingAssignments.id, id)),
  );
}
