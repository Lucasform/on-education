import { randomBytes } from 'node:crypto';

import { assertCan, type AuthContext } from '@on-education/auth';
import {
  activities,
  activityAssignments,
  type DbClient,
  students,
  studentMessages,
  studentTutorMessages,
} from '@on-education/db';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

/**
 * Portal do aluno (acesso por link). O aluno é menor, então não há e-mail/senha: o professor gera
 * um token e o aluno entra pelo link, igual ao portal do responsável. O custo de IA do Tutor roda
 * sempre na conta do tenant (escola/professor); o aluno só consome.
 */

export const STUDENT_TUTOR_DAILY_LIMIT = 20;

// --- Token de acesso (lado professor) -------------------------------------------------

/** Gera (ou retorna) o token de portal do aluno. Idempotente. */
export async function ensureStudentPortalToken(
  client: DbClient,
  ctx: AuthContext,
  studentId: string,
): Promise<string> {
  assertCan(ctx, 'update', 'student');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const [s] = await tx
      .select({ token: students.portalToken })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    if (s?.token) return s.token;
    const token = randomBytes(18).toString('hex');
    await tx.update(students).set({ portalToken: token }).where(eq(students.id, studentId));
    return token;
  });
}

/** Carrega o aluno a partir do token público (sem login). */
export async function getStudentByPortalToken(client: DbClient, token: string) {
  if (!token) return null;
  const [s] = await client.db
    .select({
      id: students.id,
      tenantId: students.tenantId,
      fullName: students.fullName,
      classId: students.classId,
    })
    .from(students)
    .where(and(eq(students.portalToken, token), isNull(students.deletedAt)))
    .limit(1);
  return s ?? null;
}

// --- Atividades atribuídas -------------------------------------------------------------

export async function assignActivityToStudent(
  client: DbClient,
  ctx: AuthContext,
  input: { activityId: string; studentId: string; dueDate?: string | null; assignedByName?: string | null },
): Promise<void> {
  assertCan(ctx, 'update', 'student');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .insert(activityAssignments)
      .values({
        tenantId: ctx.tenantId,
        activityId: input.activityId,
        studentId: input.studentId,
        dueDate: input.dueDate ?? null,
        assignedByName: input.assignedByName ?? null,
      })
      .onConflictDoNothing(),
  );
}

export async function unassignActivity(client: DbClient, ctx: AuthContext, id: string): Promise<void> {
  assertCan(ctx, 'update', 'student');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(activityAssignments).where(eq(activityAssignments.id, id)),
  );
}

/** Atividades atribuídas a um aluno, com o conteúdo. Serve ao professor e ao portal do aluno. */
export async function listStudentAssignments(client: DbClient, tenantId: string, studentId: string) {
  return client.db
    .select({
      id: activityAssignments.id,
      status: activityAssignments.status,
      dueDate: activityAssignments.dueDate,
      activityId: activities.id,
      title: activities.title,
      kind: activities.kind,
      content: activities.content,
    })
    .from(activityAssignments)
    .innerJoin(activities, eq(activities.id, activityAssignments.activityId))
    .where(
      and(
        eq(activityAssignments.tenantId, tenantId),
        eq(activityAssignments.studentId, studentId),
        isNull(activityAssignments.deletedAt),
      ),
    )
    .orderBy(desc(activityAssignments.createdAt));
}

export async function markAssignmentDone(
  client: DbClient,
  tenantId: string,
  studentId: string,
  assignmentId: string,
  done = true,
): Promise<void> {
  await client.db
    .update(activityAssignments)
    .set({ status: done ? 'concluida' : 'atribuida', updatedAt: new Date() })
    .where(
      and(
        eq(activityAssignments.id, assignmentId),
        eq(activityAssignments.tenantId, tenantId),
        eq(activityAssignments.studentId, studentId),
      ),
    );
}

// --- Chat aluno <-> professor ----------------------------------------------------------

export async function listStudentMessages(client: DbClient, tenantId: string, studentId: string) {
  return client.db
    .select()
    .from(studentMessages)
    .where(and(eq(studentMessages.tenantId, tenantId), eq(studentMessages.studentId, studentId)))
    .orderBy(studentMessages.createdAt);
}

export async function postStudentMessage(
  client: DbClient,
  input: { tenantId: string; studentId: string; body: string; fromStudent: boolean; authorName?: string | null },
): Promise<void> {
  const body = input.body.trim();
  if (!body) return;
  await client.db.insert(studentMessages).values({
    tenantId: input.tenantId,
    studentId: input.studentId,
    body,
    fromStudent: input.fromStudent,
    authorName: input.authorName ?? null,
  });
}

// --- Tutor (IA, custo no tenant) — dados + limite diário -------------------------------

export async function listStudentTutor(client: DbClient, tenantId: string, studentId: string) {
  return client.db
    .select({
      role: studentTutorMessages.role,
      body: studentTutorMessages.body,
      createdAt: studentTutorMessages.createdAt,
    })
    .from(studentTutorMessages)
    .where(and(eq(studentTutorMessages.tenantId, tenantId), eq(studentTutorMessages.studentId, studentId)))
    .orderBy(studentTutorMessages.createdAt);
}

/** Quantas perguntas o aluno já fez hoje (para o limite diário). */
export async function studentTutorUsageToday(
  client: DbClient,
  tenantId: string,
  studentId: string,
): Promise<number> {
  const rows = await client.db
    .select({ c: sql<number>`count(*)::int` })
    .from(studentTutorMessages)
    .where(
      and(
        eq(studentTutorMessages.tenantId, tenantId),
        eq(studentTutorMessages.studentId, studentId),
        eq(studentTutorMessages.role, 'user'),
        sql`${studentTutorMessages.createdAt} >= date_trunc('day', now())`,
      ),
    );
  return rows[0]?.c ?? 0;
}

export async function saveStudentTutorTurn(
  client: DbClient,
  tenantId: string,
  studentId: string,
  role: 'user' | 'tutor',
  body: string,
): Promise<void> {
  await client.db.insert(studentTutorMessages).values({ tenantId, studentId, role, body });
}
