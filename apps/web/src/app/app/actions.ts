'use server';

import type { AuthContext } from '@on-education/auth';
import {
  createCommunication,
  deleteCommunication,
  generateCommunication,
  restoreCommunication,
  setCommunicationStatus,
} from '@on-education/module-comunicacao';
import { approveDraft, discardDraft, generateDraft } from '@on-education/module-ia';
import {
  createAcademicYear,
  createClass,
  createClassesBulk,
  createEvent,
  createGuardian,
  createGuardiansBulk,
  createStudent,
  createStudentsBulk,
  createSubject,
  createSubjectsBulk,
  createTerm,
  createUnit,
  deleteClass,
  deleteEvent,
  deleteStudent,
  inviteMember,
  restoreClass,
  restoreEvent,
  restoreStudent,
} from '@on-education/module-nucleo';
import {
  createActivity,
  createPortfolioEntry,
  deleteActivity,
  restoreActivity,
} from '@on-education/module-pedagogico';
import {
  createLesson,
  recordAttendance,
  recordAttendanceBulk,
  recordGrade,
} from '@on-education/module-sala-de-aula';
import {
  createAcademicYearSchema,
  createActivitySchema,
  createClassSchema,
  createCommunicationSchema,
  createEventSchema,
  createGuardianSchema,
  createLessonSchema,
  createPortfolioEntrySchema,
  createStudentSchema,
  createSubjectSchema,
  createTermSchema,
  createUnitSchema,
  generateCommunicationSchema,
  generateDraftSchema,
  inviteMemberSchema,
  recordAttendanceSchema,
  recordGradeSchema,
} from '@on-education/validation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { db } from '@/server/db';
import { getAuthContext, signOut } from '@/server/session';

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect('/login');
}

async function requireCtx(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function createClassAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createClassSchema.parse({
    name: formData.get('name'),
    description: (formData.get('description') as string) || undefined,
  });
  await createClass(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createStudentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createStudentSchema.parse({
    fullName: formData.get('fullName'),
    classId: (formData.get('classId') as string) || undefined,
  });
  await createStudent(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const input = createActivitySchema.parse({
    title: formData.get('title'),
    subject: (formData.get('subject') as string) || undefined,
    content: (formData.get('content') as string) || '',
    tags,
    aiGenerated: false,
  });
  await createActivity(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function generateDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateDraftSchema.parse({
    kind: formData.get('kind'),
    prompt: formData.get('prompt'),
  });
  // Usa o provider Anthropic default (exige ANTHROPIC_API_KEY). A UI só mostra o form
  // quando a IA está configurada; aqui a chamada lança erro legível se faltar a key.
  await generateDraft(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function approveDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await approveDraft(db(), ctx, id);
  revalidatePath('/app', 'layout');
}

/**
 * Aprova o rascunho e o materializa como atividade no banco pedagógico (IA→banco).
 * Só faz sentido para `activity`/`lesson_plan`; o título sai da primeira linha do prompt.
 */
export async function approveDraftToBankAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  const draft = await approveDraft(db(), ctx, id);
  if (draft && (draft.kind === 'activity' || draft.kind === 'lesson_plan') && draft.output) {
    const title = (draft.prompt ?? 'Atividade gerada por IA').trim().slice(0, 120) || 'Atividade';
    await createActivity(db(), ctx, {
      title,
      content: draft.output,
      tags: ['ia', draft.kind],
      aiGenerated: true,
    });
  }
  revalidatePath('/app', 'layout');
}

export async function discardDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await discardDraft(db(), ctx, id);
  revalidatePath('/app', 'layout');
}

// --- Escola (organization) — Fase 1A.1 ---------------------------------------

export async function createUnitAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createUnitSchema.parse({ name: formData.get('name') });
  await createUnit(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = inviteMemberSchema.parse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  await inviteMember(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createAcademicYearAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createAcademicYearSchema.parse({
    name: formData.get('name'),
    startsOn: (formData.get('startsOn') as string) || undefined,
    endsOn: (formData.get('endsOn') as string) || undefined,
  });
  await createAcademicYear(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createTermAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createTermSchema.parse({
    academicYearId: formData.get('academicYearId'),
    name: formData.get('name'),
  });
  await createTerm(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createSubjectAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createSubjectSchema.parse({ name: formData.get('name') });
  await createSubject(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createGuardianAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createGuardianSchema.parse({
    fullName: formData.get('fullName'),
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
  });
  await createGuardian(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

// --- Sala de aula — Fase 1A.2 ------------------------------------------------

export async function createLessonAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createLessonSchema.parse({
    classId: formData.get('classId'),
    subjectId: (formData.get('subjectId') as string) || undefined,
    date: formData.get('date'),
    topic: formData.get('topic'),
    notes: (formData.get('notes') as string) || undefined,
  });
  await createLesson(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function recordGradeAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = recordGradeSchema.parse({
    studentId: formData.get('studentId'),
    classId: (formData.get('classId') as string) || undefined,
    label: formData.get('label'),
    value: formData.get('value'),
  });
  await recordGrade(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function recordAttendanceAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = recordAttendanceSchema.parse({
    studentId: formData.get('studentId'),
    classId: formData.get('classId'),
    date: formData.get('date'),
    present: formData.get('present') === 'on' || formData.get('present') === 'true',
  });
  await recordAttendance(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

// --- Comunicados -------------------------------------------------------------

export async function createCommunicationAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createCommunicationSchema.parse({
    title: formData.get('title'),
    body: (formData.get('body') as string) || '',
  });
  await createCommunication(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function generateCommunicationAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateCommunicationSchema.parse({ prompt: formData.get('prompt') });
  await generateCommunication(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function publishCommunicationAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await setCommunicationStatus(db(), ctx, String(formData.get('id')), 'published');
  revalidatePath('/app', 'layout');
}

export async function deleteCommunicationAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteCommunication(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

// --- Portfólio ---------------------------------------------------------------

export async function createPortfolioEntryAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createPortfolioEntrySchema.parse({
    studentId: formData.get('studentId'),
    title: formData.get('title'),
    description: (formData.get('description') as string) || undefined,
  });
  await createPortfolioEntry(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

// --- Exclusões ---------------------------------------------------------------

export async function deleteClassAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteClass(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

export async function deleteStudentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteStudent(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

export async function deleteActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteActivity(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

// --- Importação em lote ------------------------------------------------------

export async function importClassesAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const names = String(formData.get('lista') ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  await createClassesBulk(db(), ctx, names);
  revalidatePath('/app', 'layout');
}

export async function importStudentsAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  // Uma linha por aluno: "Nome Completo" ou "Nome Completo; Turma".
  const items = String(formData.get('lista') ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [fullName, className] = l.split(';').map((p) => p.trim());
      return { fullName: fullName ?? '', className: className || undefined };
    });
  await createStudentsBulk(db(), ctx, items);
  revalidatePath('/app', 'layout');
}

export async function importSubjectsAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const names = String(formData.get('lista') ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  await createSubjectsBulk(db(), ctx, names);
  revalidatePath('/app', 'layout');
}

export async function importGuardiansAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  // Uma linha por responsável: "Nome" ou "Nome; email; telefone".
  const items = String(formData.get('lista') ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [fullName, email, phone] = l.split(';').map((p) => p.trim());
      return { fullName: fullName ?? '', email: email || undefined, phone: phone || undefined };
    });
  await createGuardiansBulk(db(), ctx, items);
  revalidatePath('/app', 'layout');
}

// --- Chamada (presença em lote por turma/data) -------------------------------

export async function recordChamadaAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const classId = String(formData.get('classId') ?? '');
  const date = String(formData.get('date') ?? '');
  const ids = String(formData.get('studentIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Cada aluno tem um checkbox present_<id>; marcado = presente.
  const entries = ids.map((id) => ({
    studentId: id,
    present: formData.get(`present_${id}`) != null,
  }));
  if (classId && date) await recordAttendanceBulk(db(), ctx, classId, date, entries);
  revalidatePath('/app', 'layout');
}

// --- Calendário / eventos ----------------------------------------------------

export async function createEventAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createEventSchema.parse({
    title: formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    date: formData.get('date'),
    time: (formData.get('time') as string) || undefined,
    classId: (formData.get('classId') as string) || undefined,
  });
  await createEvent(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteEvent(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

// --- Restaurar (Lixeira) -----------------------------------------------------

export async function restoreClassAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await restoreClass(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

export async function restoreStudentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await restoreStudent(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

export async function restoreActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await restoreActivity(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

export async function restoreCommunicationAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await restoreCommunication(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

export async function restoreEventAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await restoreEvent(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}
