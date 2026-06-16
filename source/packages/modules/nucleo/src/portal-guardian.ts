import {
  absenceJustifications,
  attendance,
  communicationReads,
  communications,
  type DbClient,
  enrollmentRequests,
  exitAuthorizations,
  gradeComponents,
  grades,
  guardians,
  invoices,
  lessons,
  meetingBookings,
  meetingSlots,
  messages,
  occurrences,
  occurrenceStudents,
  schoolCalendarEvents,
  studentGuardians,
  students,
  subjects,
  terms,
} from '@on-education/db';
import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';

import { weightedAverage } from './grade-components';

/**
 * Portal do responsável — camada de dados e escrita baseada na SESSÃO DO PORTAL
 * (guardianId + tenantId), não no AuthContext de staff. Toda escrita valida que o aluno
 * pertence ao responsável (student_guardians) antes de gravar.
 */

const today = () => new Date().toISOString().slice(0, 10);

async function ownedStudentIds(client: DbClient, tenantId: string, guardianId: string) {
  const rows = await client.withTenant(tenantId, (tx) =>
    tx
      .select({ studentId: studentGuardians.studentId })
      .from(studentGuardians)
      .where(eq(studentGuardians.guardianId, guardianId)),
  );
  return rows.map((r) => r.studentId);
}

async function assertOwns(client: DbClient, tenantId: string, guardianId: string, studentId: string) {
  const ids = await ownedStudentIds(client, tenantId, guardianId);
  if (!ids.includes(studentId)) throw new Error('Aluno não vinculado a este responsável.');
}

export interface PortalBundle {
  guardian: { id: string; fullName: string; email: string | null; phone: string | null };
  students: PortalStudent[];
  communications: { id: string; title: string; body: string; createdAt: Date }[];
  upcomingEvents: { date: string; name: string; type: string }[];
  meetingSlots: { id: string; date: string; startTime: string; durationMinutes: number; title: string }[];
  chat: { id: string; sender: string; subject: string; body: string; createdAt: Date }[];
  invoices: { id: string; competencia: string; description: string; amountCents: number; dueDate: string; status: string }[];
  unread: { chat: number; communications: number };
}

export interface PortalStudent {
  id: string;
  fullName: string;
  className: string | null;
  grades: { label: string; subjectName: string | null; value: number | null; kind: string }[];
  boletim: { finalAverage: string; status: string; components: { name: string; average: string }[] };
  absencesTotal: number;
  recentAbsences: { date: string; subjectName: string | null }[];
  recentLessons: { date: string; topic: string; subjectName: string | null }[];
  occurrences: { date: string; title: string; severity: string }[];
  exitRequests: { id: string; date: string; time: string | null; reason: string; status: string }[];
  justifications: { id: string; date: string; reason: string; status: string }[];
}

/** Pacote completo do portal para um responsável. Uma chamada, tudo da sessão. */
export async function getPortalBundle(
  client: DbClient,
  guardianId: string,
  tenantId: string,
): Promise<PortalBundle | null> {
  return client.withTenant(tenantId, async (tx) => {
    const gRows = await tx.select().from(guardians).where(eq(guardians.id, guardianId)).limit(1);
    const g = gRows[0];
    if (!g) return null;

    const vinc = await tx
      .select({ studentId: studentGuardians.studentId })
      .from(studentGuardians)
      .where(eq(studentGuardians.guardianId, guardianId));
    const sids = vinc.map((v) => v.studentId);

    const base: PortalBundle = {
      guardian: { id: g.id, fullName: g.fullName, email: g.email, phone: g.phone },
      students: [],
      communications: [],
      upcomingEvents: [],
      meetingSlots: [],
      chat: [],
      invoices: [],
      unread: { chat: 0, communications: 0 },
    };

    // Comunicados publicados
    base.communications = await tx
      .select({ id: communications.id, title: communications.title, body: communications.body, createdAt: communications.createdAt })
      .from(communications)
      .where(and(eq(communications.status, 'published'), isNull(communications.deletedAt)))
      .orderBy(desc(communications.createdAt))
      .limit(10);

    // Próximos eventos do calendário escolar
    base.upcomingEvents = await tx
      .select({ date: schoolCalendarEvents.date, name: schoolCalendarEvents.name, type: schoolCalendarEvents.type })
      .from(schoolCalendarEvents)
      .where(and(isNull(schoolCalendarEvents.deletedAt), gte(schoolCalendarEvents.date, today())))
      .orderBy(asc(schoolCalendarEvents.date))
      .limit(8);

    // Horários de reunião disponíveis
    base.meetingSlots = await tx
      .select({ id: meetingSlots.id, date: meetingSlots.date, startTime: meetingSlots.startTime, durationMinutes: meetingSlots.durationMinutes, title: meetingSlots.title })
      .from(meetingSlots)
      .where(and(eq(meetingSlots.available, true), isNull(meetingSlots.deletedAt), gte(meetingSlots.date, today())))
      .orderBy(asc(meetingSlots.date), asc(meetingSlots.startTime))
      .limit(20);

    // Chat (mensagens do responsável)
    base.chat = await tx
      .select({ id: messages.id, sender: messages.sender, subject: messages.subject, body: messages.body, createdAt: messages.createdAt })
      .from(messages)
      .where(and(eq(messages.guardianId, guardianId), isNull(messages.deletedAt)))
      .orderBy(asc(messages.createdAt))
      .limit(100);
    base.unread.chat = base.chat.filter((m) => m.sender === 'school').length === 0
      ? 0
      : (
          await tx
            .select({ id: messages.id })
            .from(messages)
            .where(and(eq(messages.guardianId, guardianId), eq(messages.sender, 'school'), isNull(messages.readAt), isNull(messages.deletedAt)))
        ).length;

    // Comunicados não lidos por este responsável
    const readRows = await tx
      .select({ communicationId: communicationReads.communicationId })
      .from(communicationReads)
      .where(eq(communicationReads.guardianId, guardianId));
    const readSet = new Set(readRows.map((r) => r.communicationId));
    base.unread.communications = base.communications.filter((c) => !readSet.has(c.id)).length;

    // Faturas (mensalidades) do responsável e/ou dos seus alunos
    const invWhere =
      sids.length > 0
        ? or(eq(invoices.guardianId, guardianId), inArray(invoices.studentId, sids))
        : eq(invoices.guardianId, guardianId);
    base.invoices = await tx
      .select({ id: invoices.id, competencia: invoices.competencia, description: invoices.description, amountCents: invoices.amountCents, dueDate: invoices.dueDate, status: invoices.status })
      .from(invoices)
      .where(and(invWhere, isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.dueDate))
      .limit(24);

    if (sids.length === 0) return base;

    const comps = await tx.select().from(gradeComponents);
    const allTerms = await tx.select().from(terms);
    void allTerms;

    const allStudents = await tx.select().from(students).where(inArray(students.id, sids));
    const allGrades = await tx
      .select({ studentId: grades.studentId, label: grades.label, subjectName: subjects.name, value: grades.value, kind: grades.kind, componentId: grades.componentId })
      .from(grades)
      .leftJoin(subjects, eq(subjects.id, grades.subjectId))
      .where(and(inArray(grades.studentId, sids), isNull(grades.deletedAt)))
      .orderBy(desc(grades.createdAt));
    const allAtt = await tx
      .select({ studentId: attendance.studentId, present: attendance.present, date: attendance.date, subjectName: subjects.name, classId: attendance.classId })
      .from(attendance)
      .leftJoin(subjects, eq(subjects.id, attendance.subjectId))
      .where(inArray(attendance.studentId, sids))
      .orderBy(desc(attendance.date));
    const occRows = await tx
      .select({ studentId: occurrenceStudents.studentId, title: occurrences.title, date: occurrences.date, severity: occurrences.severity })
      .from(occurrenceStudents)
      .innerJoin(occurrences, eq(occurrences.id, occurrenceStudents.occurrenceId))
      .where(and(inArray(occurrenceStudents.studentId, sids), isNull(occurrences.deletedAt)))
      .orderBy(desc(occurrences.date));
    const exitRows = await tx
      .select({ id: exitAuthorizations.id, studentId: exitAuthorizations.studentId, date: exitAuthorizations.date, time: exitAuthorizations.time, reason: exitAuthorizations.reason, status: exitAuthorizations.status })
      .from(exitAuthorizations)
      .where(and(inArray(exitAuthorizations.studentId, sids), isNull(exitAuthorizations.deletedAt)))
      .orderBy(desc(exitAuthorizations.date));
    const justRows = await tx
      .select({ id: absenceJustifications.id, studentId: absenceJustifications.studentId, date: absenceJustifications.date, reason: absenceJustifications.reason, status: absenceJustifications.status })
      .from(absenceJustifications)
      .where(and(inArray(absenceJustifications.studentId, sids), isNull(absenceJustifications.deletedAt)))
      .orderBy(desc(absenceJustifications.date));
    const classIds = [...new Set(allStudents.map((s) => s.classId).filter(Boolean) as string[])];
    const recentLessons = classIds.length
      ? await tx
          .select({ classId: lessons.classId, date: lessons.date, topic: lessons.topic, subjectName: subjects.name })
          .from(lessons)
          .leftJoin(subjects, eq(subjects.id, lessons.subjectId))
          .where(and(inArray(lessons.classId, classIds), isNull(lessons.deletedAt), lte(lessons.date, today())))
          .orderBy(desc(lessons.date))
          .limit(40)
      : [];

    base.students = allStudents.map((s) => {
      const myGrades = allGrades.filter((x) => x.studentId === s.id);
      const att = allAtt.filter((x) => x.studentId === s.id);
      const absences = att.filter((x) => !x.present);
      const finalNum = weightedAverage(
        myGrades.map((x) => ({ value: x.value, componentId: x.componentId })),
        comps,
      );
      const scale = 10;
      const status =
        finalNum === null
          ? 'sem nota'
          : finalNum / scale >= 0.7
            ? 'Aprovado'
            : finalNum / scale < 0.5
              ? 'Reprovado'
              : 'Recuperação';
      const componentAvgs = comps.map((c) => {
        const vs = myGrades.filter((x) => x.componentId === c.id && x.value !== null).map((x) => x.value as number);
        return { name: c.name, average: vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : '—' };
      });
      return {
        id: s.id,
        fullName: s.fullName,
        className: null,
        grades: myGrades.map((x) => ({ label: x.label, subjectName: x.subjectName ?? null, value: x.value, kind: x.kind })),
        boletim: { finalAverage: finalNum === null ? '—' : finalNum.toFixed(1), status, components: componentAvgs },
        absencesTotal: absences.length,
        recentAbsences: absences.slice(0, 10).map((x) => ({ date: x.date, subjectName: x.subjectName ?? null })),
        recentLessons: recentLessons
          .filter((l) => l.classId === s.classId)
          .slice(0, 8)
          .map((l) => ({ date: l.date, topic: l.topic, subjectName: l.subjectName ?? null })),
        occurrences: occRows.filter((o) => o.studentId === s.id).map((o) => ({ date: o.date, title: o.title, severity: o.severity })),
        exitRequests: exitRows.filter((e) => e.studentId === s.id).map((e) => ({ id: e.id, date: e.date, time: e.time, reason: e.reason, status: e.status })),
        justifications: justRows.filter((j) => j.studentId === s.id).map((j) => ({ id: j.id, date: j.date, reason: j.reason, status: j.status })),
      };
    });

    return base;
  });
}

// --- Escritas do responsável (validam posse do aluno) ------------------------

export async function guardianRequestExit(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  input: { studentId: string; date: string; time?: string | null; reason: string; authorizedByName?: string | null },
) {
  await assertOwns(client, tenantId, guardianId, input.studentId);
  await client.withTenant(tenantId, (tx) =>
    tx.insert(exitAuthorizations).values({
      tenantId,
      studentId: input.studentId,
      date: input.date,
      time: input.time || null,
      reason: input.reason,
      authorizedByName: input.authorizedByName || null,
      status: 'pending',
    }),
  );
}

export async function guardianSubmitJustification(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  input: { studentId: string; date: string; reason: string; documentUrl?: string | null; submittedByName?: string | null },
) {
  await assertOwns(client, tenantId, guardianId, input.studentId);
  await client.withTenant(tenantId, (tx) =>
    tx.insert(absenceJustifications).values({
      tenantId,
      studentId: input.studentId,
      date: input.date,
      reason: input.reason,
      documentUrl: input.documentUrl || null,
      submittedByName: input.submittedByName || null,
      status: 'pending',
    }),
  );
}

export async function guardianBookMeeting(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  input: { slotId: string; studentId?: string | null; guardianName: string; guardianPhone?: string | null; notes?: string | null },
) {
  if (input.studentId) await assertOwns(client, tenantId, guardianId, input.studentId);
  await client.withTenant(tenantId, async (tx) => {
    const slot = await tx
      .select({ id: meetingSlots.id, available: meetingSlots.available })
      .from(meetingSlots)
      .where(eq(meetingSlots.id, input.slotId))
      .limit(1);
    if (!slot[0] || !slot[0].available) throw new Error('Horário indisponível.');
    await tx.insert(meetingBookings).values({
      tenantId,
      slotId: input.slotId,
      studentId: input.studentId || null,
      guardianName: input.guardianName,
      guardianPhone: input.guardianPhone || null,
      notes: input.notes || null,
    });
    await tx.update(meetingSlots).set({ available: false }).where(eq(meetingSlots.id, input.slotId));
  });
}

export async function guardianSendMessage(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  input: { subject: string; body: string; studentId?: string | null },
) {
  await client.withTenant(tenantId, (tx) =>
    tx.insert(messages).values({
      tenantId,
      guardianId,
      studentId: input.studentId || null,
      subject: input.subject || 'Mensagem do responsável',
      body: input.body,
      sender: 'guardian',
    }),
  );
}

export async function guardianRequestReenrollment(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  input: { studentId: string; notes?: string | null },
) {
  await assertOwns(client, tenantId, guardianId, input.studentId);
  await client.withTenant(tenantId, async (tx) => {
    const s = await tx.select().from(students).where(eq(students.id, input.studentId)).limit(1);
    const g = await tx.select().from(guardians).where(eq(guardians.id, guardianId)).limit(1);
    if (!s[0] || !g[0]) throw new Error('Aluno ou responsável não encontrado.');
    await tx.insert(enrollmentRequests).values({
      tenantId,
      studentName: s[0].fullName,
      birthDate: s[0].birthDate ?? null,
      shift: s[0].shift ?? null,
      guardianName: g[0].fullName,
      guardianEmail: g[0].email ?? null,
      guardianPhone: g[0].phone ?? null,
      relation: 'responsável',
      notes: `Rematrícula solicitada pelo portal. ${input.notes ?? ''}`.trim(),
      status: 'pending',
    });
  });
}

/** Marca como lidas as mensagens da escola para este responsável. */
export async function guardianMarkChatRead(client: DbClient, tenantId: string, guardianId: string) {
  await client.withTenant(tenantId, (tx) =>
    tx
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.guardianId, guardianId), eq(messages.sender, 'school'), isNull(messages.readAt))),
  );
}

export async function guardianUpdateContact(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  input: { phone?: string | null; email?: string | null; address?: string | null },
) {
  await client.withTenant(tenantId, (tx) =>
    tx
      .update(guardians)
      .set({
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        updatedAt: new Date(),
      })
      .where(eq(guardians.id, guardianId)),
  );
}
