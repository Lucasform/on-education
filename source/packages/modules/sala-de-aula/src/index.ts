export * from './schedule';
export * from './lesson-plans';
export * from './generate';
export * from './curriculum';

import { assertCan, type AuthContext } from '@on-education/auth';
import { attendance, type DbClient, grades, lessonPlans, lessons, subjects } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import type {
  CreateLessonInput,
  RecordAttendanceInput,
  RecordGradeInput,
} from '@on-education/validation';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';

/**
 * Sala de aula (Fase 1A.2): diário, notas e faltas. Checagem tripla (RBAC + entitlement +
 * RLS). Reusa `classes`/`students` do núcleo. Diário/vínculo de aula = `classes.planning`
 * (Professor Pro); notas e chamada = `classes.manage` (Professor).
 */
const FEATURE = 'classes.manage'; // notas + chamada (Professor)
const FEATURE_PLANNING = 'classes.planning'; // diário de classe / vínculo de plano (Pro)

// --- Diário (lessons) --------------------------------------------------------
export async function createLesson(client: DbClient, ctx: AuthContext, input: CreateLessonInput) {
  assertCan(ctx, 'create', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE_PLANNING);
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

/**
 * Diário com tudo que a tela precisa: nome da matéria, status (prevista/dada/cancelada) e
 * origem. `from` opcional corta por período. Ordenado por data (mais recente primeiro) e
 * horário implícito via matéria. Base do diário automático (motor de aulas previstas).
 */
export async function listLessonsForDiary(
  client: DbClient,
  ctx: AuthContext,
  opts?: { from?: string; classId?: string },
) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, (tx) => {
    const filtros = [
      opts?.from ? gte(lessons.date, opts.from) : undefined,
      opts?.classId ? eq(lessons.classId, opts.classId) : undefined,
    ].filter(Boolean);
    const q = tx
      .select({
        id: lessons.id,
        classId: lessons.classId,
        subjectId: lessons.subjectId,
        subjectName: subjects.name,
        date: lessons.date,
        topic: lessons.topic,
        notes: lessons.notes,
        status: lessons.status,
        slotId: lessons.slotId,
        cancelReason: lessons.cancelReason,
        lessonPlanId: lessons.lessonPlanId,
      })
      .from(lessons)
      .leftJoin(subjects, eq(subjects.id, lessons.subjectId))
      .orderBy(desc(lessons.date), asc(subjects.name));
    return filtros.length ? q.where(and(...filtros)) : q;
  });
}

/**
 * Marca uma aula do diário: `dada` (com tema opcional), `cancelada` (com motivo) ou volta a
 * `prevista`. Filosofia da UI: prevista já conta como dada; o professor só age na exceção.
 */
export async function setLessonStatus(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  input: { status: 'prevista' | 'dada' | 'cancelada'; topic?: string; cancelReason?: string },
) {
  assertCan(ctx, 'update', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE_PLANNING);
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(lessons)
      .set({
        status: input.status,
        ...(input.topic !== undefined ? { topic: input.topic } : {}),
        cancelReason: input.status === 'cancelada' ? (input.cancelReason ?? null) : null,
        updatedAt: sql`now()`,
      })
      .where(eq(lessons.id, id)),
  );
}

/**
 * Próximas aulas previstas (do motor de horários) dentro de um intervalo, com nome da
 * matéria e título do plano vinculado (se houver). Usado no plano de aulas por dia.
 */
export async function listUpcomingLessons(
  client: DbClient,
  ctx: AuthContext,
  opts: { classId?: string; from: string; to: string },
) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, (tx) => {
    const filtros = [
      gte(lessons.date, opts.from),
      lte(lessons.date, opts.to),
      opts.classId ? eq(lessons.classId, opts.classId) : undefined,
    ].filter(Boolean);
    return tx
      .select({
        id: lessons.id,
        classId: lessons.classId,
        subjectId: lessons.subjectId,
        subjectName: subjects.name,
        date: lessons.date,
        topic: lessons.topic,
        status: lessons.status,
        unitId: lessons.unitId,
        lessonPlanId: lessons.lessonPlanId,
        planTitle: lessonPlans.title,
      })
      .from(lessons)
      .leftJoin(subjects, eq(subjects.id, lessons.subjectId))
      .leftJoin(lessonPlans, eq(lessonPlans.id, lessons.lessonPlanId))
      .where(and(...filtros))
      .orderBy(asc(lessons.date), asc(subjects.name));
  });
}

/** Vincula (ou desvincula) um plano de aula a uma aula do diário. */
export async function linkLessonToPlan(
  client: DbClient,
  ctx: AuthContext,
  lessonId: string,
  planId: string | null,
) {
  assertCan(ctx, 'update', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE_PLANNING);
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(lessons)
      .set({ lessonPlanId: planId, updatedAt: sql`now()` })
      .where(eq(lessons.id, lessonId)),
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
    tx.select().from(grades).where(sql`${grades.deletedAt} IS NULL`).orderBy(desc(grades.createdAt)),
  );
}

/** Notas de UM aluno (evita varrer todas as notas do tenant na ficha/relatório). */
export async function listGradesForStudent(client: DbClient, ctx: AuthContext, studentId: string) {
  assertCan(ctx, 'read', 'grade');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(grades)
      .where(and(eq(grades.studentId, studentId), sql`${grades.deletedAt} IS NULL`))
      .orderBy(desc(grades.createdAt)),
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

/** Faltas/presenças de UM aluno (evita varrer toda a frequência do tenant). */
export async function listAttendanceForStudent(
  client: DbClient,
  ctx: AuthContext,
  studentId: string,
) {
  assertCan(ctx, 'read', 'attendance');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.date)),
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

/** Exclui um lançamento de nota pelo id (soft-delete via deletedAt). */
export async function deleteGrade(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'grade');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(grades)
      .set({ deletedAt: new Date() })
      .where(and(eq(grades.id, id), eq(grades.tenantId, ctx.tenantId))),
  );
}

/** Presenças de uma turma numa data específica (para pré-preencher a chamada). */
export async function listAttendanceForDateClass(
  client: DbClient,
  ctx: AuthContext,
  classId: string,
  date: string,
  subjectId?: string | null,
) {
  assertCan(ctx, 'read', 'attendance');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.classId, classId),
          eq(attendance.date, date),
          subjectId ? eq(attendance.subjectId, subjectId) : sql`${attendance.subjectId} IS NULL`,
        ),
      ),
  );
}
