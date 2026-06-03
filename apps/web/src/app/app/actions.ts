'use server';

import type { AuthContext } from '@on-education/auth';
import {
  createCommunication,
  createMessage,
  deleteCommunication,
  deleteMessage,
  generateCommunication,
  restoreCommunication,
  setCommunicationStatus,
} from '@on-education/module-comunicacao';
import { approveDraft, discardDraft, generateDraft } from '@on-education/module-ia';
import {
  assignTeaching,
  createAcademicYear,
  createClass,
  createClassesBulk,
  createEvent,
  createGradeComponent,
  deleteGradeComponent,
  createGuardian,
  createGuardiansBulk,
  createOccurrence,
  createStudent,
  createStudentsBulk,
  createSubject,
  createSubjectsBulk,
  createTerm,
  createUnit,
  deleteClass,
  deleteEvent,
  deleteOccurrence,
  deleteStudent,
  inviteMember,
  linkClassSubject,
  linkGuardian,
  removeTeachingAssignment,
  restoreClass,
  restoreEvent,
  restoreStudent,
  unlinkClassSubject,
  unlinkGuardian,
  updateClassDetails,
  upsertTenantSettings,
} from '@on-education/module-nucleo';
import {
  addQuizQuestion,
  createActivity,
  createPortfolioEntry,
  createQuiz,
  deleteActivity,
  deleteQuiz,
  generateActivityWithEduON,
  generateQuizWithEduON,
  restoreActivity,
  submitQuizAttempt,
} from '@on-education/module-pedagogico';
import {
  createLesson,
  createLessonPlan,
  createScheduleException,
  createScheduleSlot,
  deleteLessonPlan,
  deleteScheduleException,
  deleteScheduleSlot,
  recordAttendance,
  recordAttendanceBulk,
  recordGrade,
} from '@on-education/module-sala-de-aula';
import {
  addQuizQuestionSchema,
  assignTeachingSchema,
  createScheduleSlotSchema,
  createScheduleExceptionSchema,
  createLessonPlanSchema,
  createGradeComponentSchema,
  updateGradeScaleSchema,
  updateAiStandardSchema,
  linkClassSubjectSchema,
  linkGuardianSchema,
  updateClassSchema,
  createAcademicYearSchema,
  createActivitySchema,
  createClassSchema,
  createMessageSchema,
  createOccurrenceSchema,
  createQuizSchema,
  generateActivitySchema,
  generateQuizSchema,
  submitQuizAttemptSchema,
  updateTenantSettingsSchema,
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

import { parseCsvRecords, pick } from '@/lib/csv';
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
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    ageRange: (formData.get('ageRange') as string) || undefined,
  });
  await createClass(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function createStudentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createStudentSchema.parse({
    fullName: formData.get('fullName'),
    classId: (formData.get('classId') as string) || undefined,
    birthDate: (formData.get('birthDate') as string) || undefined,
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

/** Gera uma atividade pelo EduON e salva direto no banco. */
export async function generateActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateActivitySchema.parse({
    topic: formData.get('topic'),
    subject: (formData.get('subject') as string) || undefined,
    level: (formData.get('level') as string) || undefined,
    kind: (formData.get('kind') as string) || 'atividade',
  });
  await generateActivityWithEduON(db(), ctx, input);
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
    lessonPlanId: (formData.get('lessonPlanId') as string) || undefined,
    date: formData.get('date'),
    topic: formData.get('topic'),
    notes: (formData.get('notes') as string) || undefined,
  });
  await createLesson(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function recordGradeAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const rawValue = (formData.get('value') as string) || '';
  const input = recordGradeSchema.parse({
    studentId: formData.get('studentId'),
    classId: (formData.get('classId') as string) || undefined,
    kind: (formData.get('kind') as string) || 'formal',
    label: formData.get('label'),
    value: rawValue === '' ? undefined : rawValue,
    note: (formData.get('note') as string) || undefined,
    componentId: (formData.get('componentId') as string) || undefined,
  });
  await recordGrade(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function recordAttendanceAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = recordAttendanceSchema.parse({
    studentId: formData.get('studentId'),
    classId: formData.get('classId'),
    subjectId: (formData.get('subjectId') as string) || undefined,
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
  // Matéria opcional: chamada por dia (vazio) ou por matéria (8.1).
  const subjectId = (formData.get('subjectId') as string) || null;
  const ids = String(formData.get('studentIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Cada aluno tem um checkbox present_<id>; marcado = presente.
  const entries = ids.map((id) => ({
    studentId: id,
    present: formData.get(`present_${id}`) != null,
  }));
  if (classId && date) await recordAttendanceBulk(db(), ctx, classId, date, entries, subjectId);
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

// --- Simulados / quizzes -----------------------------------------------------

export async function createQuizAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createQuizSchema.parse({
    title: formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    subject: (formData.get('subject') as string) || undefined,
  });
  const quiz = await createQuiz(db(), ctx, input);
  redirect(`/app/simulados/${quiz.id}`);
}

export async function deleteQuizAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteQuiz(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/simulados', 'page');
}

// --- Ocorrências -------------------------------------------------------------

export async function createOccurrenceAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const studentIds = formData.getAll('studentIds').map(String).filter(Boolean);
  const input = createOccurrenceSchema.parse({
    title: formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    date: formData.get('date'),
    severity: formData.get('severity'),
    studentIds,
  });
  await createOccurrence(db(), ctx, input);
  revalidatePath('/app/ocorrencias', 'page');
}

export async function deleteOccurrenceAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteOccurrence(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/ocorrencias', 'page');
}

// --- Personalização da escola ------------------------------------------------

export async function updateTenantSettingsAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = updateTenantSettingsSchema.parse({
    logoUrl: (formData.get('logoUrl') as string) || '',
    themeColor: (formData.get('themeColor') as string) || undefined,
    regimento: (formData.get('regimento') as string) || undefined,
    docTemplates: (formData.get('docTemplates') as string) || undefined,
  });
  await upsertTenantSettings(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

// --- Meu padrão / padrão do EduON (item 18.3) --------------------------------

export async function updateAiStandardAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = updateAiStandardSchema.parse({
    aiStandard: (formData.get('aiStandard') as string) ?? '',
  });
  await upsertTenantSettings(db(), ctx, input);
  revalidatePath('/app/meu-padrao', 'page');
}

// --- Mensagens internas (responsáveis) ---------------------------------------

export async function createMessageAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createMessageSchema.parse({
    guardianId: formData.get('guardianId'),
    studentId: (formData.get('studentId') as string) || undefined,
    subject: formData.get('subject'),
    body: (formData.get('body') as string) || '',
  });
  await createMessage(db(), ctx, input);
  revalidatePath('/app/mensagens', 'page');
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteMessage(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/mensagens', 'page');
}

/** Gera um simulado completo pelo EduON e abre o resultado para revisão. */
export async function generateQuizAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateQuizSchema.parse({
    topic: formData.get('topic'),
    subject: (formData.get('subject') as string) || undefined,
    level: (formData.get('level') as string) || undefined,
    count: Number(formData.get('count') ?? 5),
  });
  const quiz = await generateQuizWithEduON(db(), ctx, input);
  redirect(`/app/simulados/${quiz.id}`);
}

export async function addQuizQuestionAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  // Opções: uma por linha. O índice correto é 1-based no form (mais natural ao humano).
  const options = String(formData.get('options') ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const correct1 = Number(formData.get('correct') ?? 1);
  const input = addQuizQuestionSchema.parse({
    quizId: formData.get('quizId'),
    prompt: formData.get('prompt'),
    options,
    correctIndex: Number.isFinite(correct1) ? Math.max(0, correct1 - 1) : 0,
  });
  await addQuizQuestion(db(), ctx, input);
  revalidatePath(`/app/simulados/${input.quizId}`, 'page');
}

export async function submitQuizAttemptAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const quizId = String(formData.get('quizId') ?? '');
  const count = Number(formData.get('count') ?? 0);
  // Cada questão i tem um grupo de rádios `q_<i>` com o índice (0-based) escolhido.
  const answers = Array.from({ length: count }, (_, i) => Number(formData.get(`q_${i}`) ?? -1));
  const input = submitQuizAttemptSchema.parse({
    quizId,
    studentName: (formData.get('studentName') as string) || undefined,
    answers,
  });
  await submitQuizAttempt(db(), ctx, input);
  revalidatePath(`/app/simulados/${quizId}`, 'page');
}

// --- Vínculos do professor (item 17) -----------------------------------------

export async function assignTeachingAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = assignTeachingSchema.parse({
    membershipId: formData.get('membershipId'),
    classId: formData.get('classId'),
    subjectId: (formData.get('subjectId') as string) || undefined,
  });
  await assignTeaching(db(), ctx, input);
  revalidatePath('/app/escola/professores', 'page');
}

export async function removeTeachingAssignmentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await removeTeachingAssignment(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/escola/professores', 'page');
}

// --- Importação por planilha (CSV/Excel) -------------------------------------

/** Lê o arquivo CSV enviado e devolve os registros (coluna→valor) já normalizados. */
async function readCsv(formData: FormData): Promise<Record<string, string>[]> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return [];
  const text = await file.text();
  return parseCsvRecords(text);
}

/** Converte "DD/MM/AAAA" ou "AAAA-MM-DD" para ISO (AAAA-MM-DD); senão, undefined. */
function parseBrDate(raw: string): string | undefined {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return undefined;
}

export async function importStudentsCsvAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const recs = await readCsv(formData);
  const items = recs
    .map((r) => ({
      fullName: pick(r, 'nome', 'aluno', 'nome completo', 'name'),
      className: pick(r, 'turma', 'classe', 'serie', 'class') || undefined,
      birthDate: parseBrDate(
        pick(r, 'nascimento', 'data de nascimento', 'aniversario', 'birthdate'),
      ),
    }))
    .filter((i) => i.fullName);
  if (items.length) await createStudentsBulk(db(), ctx, items);
  revalidatePath('/app/alunos', 'page');
}

export async function importClassesCsvAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const recs = await readCsv(formData);
  const names = recs.map((r) => pick(r, 'nome', 'turma', 'name')).filter(Boolean);
  if (names.length) await createClassesBulk(db(), ctx, names);
  revalidatePath('/app/turmas', 'page');
}

export async function importGuardiansCsvAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const recs = await readCsv(formData);
  const items = recs
    .map((r) => ({
      fullName: pick(r, 'nome', 'responsavel', 'name'),
      email: pick(r, 'email', 'e-mail') || undefined,
      phone: pick(r, 'telefone', 'celular', 'fone', 'phone') || undefined,
    }))
    .filter((i) => i.fullName);
  if (items.length) await createGuardiansBulk(db(), ctx, items);
  revalidatePath('/app/escola/responsaveis', 'page');
}

// --- Turma: detalhes (série/idade) + matérias da turma (itens 3 / 3.2) -------

export async function updateClassDetailsAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = updateClassSchema.parse({
    classId: formData.get('classId'),
    description: (formData.get('description') as string) || undefined,
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    ageRange: (formData.get('ageRange') as string) || undefined,
  });
  await updateClassDetails(db(), ctx, input);
  revalidatePath(`/app/turmas/${input.classId}`, 'page');
}

export async function linkClassSubjectAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = linkClassSubjectSchema.parse({
    classId: formData.get('classId'),
    subjectId: formData.get('subjectId'),
  });
  await linkClassSubject(db(), ctx, input);
  revalidatePath(`/app/turmas/${input.classId}`, 'page');
}

export async function unlinkClassSubjectAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await unlinkClassSubject(db(), ctx, String(formData.get('id')));
  revalidatePath(`/app/turmas/${String(formData.get('classId'))}`, 'page');
}

// --- Notas: composição/pesos definidos pela escola ---------------------------

export async function createGradeComponentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createGradeComponentSchema.parse({
    name: formData.get('name'),
    weight: formData.get('weight'),
  });
  await createGradeComponent(db(), ctx, input);
  revalidatePath('/app/escola/notas', 'page');
}

export async function deleteGradeComponentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteGradeComponent(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/escola/notas', 'page');
}

export async function updateGradeScaleAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = updateGradeScaleSchema.parse({ gradeScale: formData.get('gradeScale') });
  await upsertTenantSettings(db(), ctx, input);
  revalidatePath('/app/escola/notas', 'page');
}

// --- Planejamento (planos de aula / avaliações / trabalhos — itens 7.1/7.3) --

export async function createLessonPlanAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createLessonPlanSchema.parse({
    classId: formData.get('classId'),
    subjectId: (formData.get('subjectId') as string) || undefined,
    kind: (formData.get('kind') as string) || 'aula',
    title: formData.get('title'),
    content: (formData.get('content') as string) || undefined,
    date: (formData.get('date') as string) || undefined,
  });
  await createLessonPlan(db(), ctx, input);
  revalidatePath('/app/sala/planejamento', 'page');
}

export async function deleteLessonPlanAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteLessonPlan(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/sala/planejamento', 'page');
}

// --- Cronograma / horário semanal (item 7) -----------------------------------

export async function createScheduleSlotAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createScheduleSlotSchema.parse({
    classId: formData.get('classId'),
    subjectId: (formData.get('subjectId') as string) || undefined,
    weekday: formData.get('weekday'),
    startTime: formData.get('startTime'),
    endTime: (formData.get('endTime') as string) || undefined,
    note: (formData.get('note') as string) || undefined,
  });
  await createScheduleSlot(db(), ctx, input);
  revalidatePath('/app/cronograma', 'page');
}

export async function deleteScheduleSlotAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteScheduleSlot(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/cronograma', 'page');
}

export async function createScheduleExceptionAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createScheduleExceptionSchema.parse({
    classId: formData.get('classId'),
    date: formData.get('date'),
    note: formData.get('note'),
  });
  await createScheduleException(db(), ctx, input);
  revalidatePath('/app/cronograma', 'page');
}

export async function deleteScheduleExceptionAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteScheduleException(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/cronograma', 'page');
}

// --- Vínculo aluno↔responsável (itens 4 / 5) ---------------------------------

export async function linkGuardianAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = linkGuardianSchema.parse({
    studentId: formData.get('studentId'),
    guardianId: formData.get('guardianId'),
    relation: (formData.get('relation') as string) || undefined,
    isFinancial: formData.get('isFinancial') != null,
    canPickup: formData.get('canPickup') != null,
    isEmergency: formData.get('isEmergency') != null,
  });
  await linkGuardian(db(), ctx, input);
  revalidatePath(`/app/alunos/${input.studentId}`, 'page');
}

export async function unlinkGuardianAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await unlinkGuardian(db(), ctx, String(formData.get('id')));
  revalidatePath(`/app/alunos/${String(formData.get('studentId'))}`, 'page');
}
