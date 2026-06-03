export * from './schedule';
export * from './lesson-plans';

import { assertCan, type AuthContext } from '@on-education/auth';
import { attendance, type DbClient, grades, lessons } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import type {
  CreateLessonInput,
  RecordAttendanceInput,
  RecordGradeInput,
} from '@on-education/validation';
import { desc, sql } from 'drizzle-orm';

/**
 * Sala de aula (Fase 1A.2): diário, notas e faltas. Checagem tripla (RBAC + entitlement +
 * RLS). Reusa `classes`/`students` do núcleo. Feature-gate em `classes.manage`.
 */
const FEATURE = 'classes.manage';

// --- Diário (lessons) --------------------------------------------------------
export async function createLesson(client: DbClient, ctx: AuthContext, input: CreateLessonInput) {
  assertCan(ctx, 'create', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(lessons)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        lessonPlanId: input.lessonPlanId ?? null,
        date: input.date,
        topic: input.topic,
        notes: input.notes ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listLessons(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(lessons).orderBy(desc(lessons.date)),
  );
}

// --- Notas (grades) ----------------------------------------------------------
export async function recordGrade(client: DbClient, ctx: AuthContext, input: RecordGradeInput) {
  assertCan(ctx, 'create', 'grade');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(grades)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        classId: input.classId ?? null,
        subjectId: input.subjectId ?? null,
        termId: input.termId ?? null,
        kind: input.kind,
        label: input.label,
        value: input.kind === 'anotacao' ? null : (input.value ?? null),
        note: input.note ?? null,
        componentId: input.componentId ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listGrades(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'grade');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(grades).orderBy(desc(grades.createdAt)),
  );
}

// --- Faltas (attendance) -----------------------------------------------------
export async function recordAttendance(
  client: DbClient,
  ctx: AuthContext,
  input: RecordAttendanceInput,
) {
  assertCan(ctx, 'create', 'attendance');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .insert(attendance)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        date: input.date,
        present: input.present,
        createdBy: ctx.userId,
      })
      .onConflictDoUpdate({
        target: [
          attendance.tenantId,
          attendance.studentId,
          attendance.classId,
          attendance.date,
          attendance.subjectId,
        ],
        set: { present: input.present, updatedAt: sql`now()` },
      }),
  );
}

export async function listAttendance(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'attendance');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(attendance).orderBy(desc(attendance.date)),
  );
}

/**
 * Chamada: registra presença de vários alunos de uma turma numa data (upsert por aluno).
 * `subjectId` opcional faz a chamada ser POR MATÉRIA (8.1); nulo = chamada do dia.
 */
export async function recordAttendanceBulk(
  client: DbClient,
  ctx: AuthContext,
  classId: string,
  date: string,
  entries: { studentId: string; present: boolean }[],
  subjectId?: string | null,
) {
  assertCan(ctx, 'create', 'attendance');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  if (entries.length === 0) return 0;
  await client.withTenant(ctx.tenantId, async (tx) => {
    for (const e of entries) {
      await tx
        .insert(attendance)
        .values({
          tenantId: ctx.tenantId,
          studentId: e.studentId,
          classId,
          subjectId: subjectId ?? null,
          date,
          present: e.present,
          createdBy: ctx.userId,
        })
        .onConflictDoUpdate({
          target: [
            attendance.tenantId,
            attendance.studentId,
            attendance.classId,
            attendance.date,
            attendance.subjectId,
          ],
          set: { present: e.present, updatedAt: sql`now()` },
        });
    }
  });
  return entries.length;
}
