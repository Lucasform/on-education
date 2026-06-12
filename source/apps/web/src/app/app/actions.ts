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
import {
  approveDraft,
  deleteGeneratedImage,
  discardDraft,
  encryptSecret,
  generateDraft,
  generateTenantImage,
  recordImages,
  resolveTenantProvider,
  saveGeneratedImage,
  writeParentNote,
} from '@on-education/module-ia';
import {
  assignTeaching,
  createApiKey,
  createStandardSample,
  deleteStandardSample,
  revokeApiKey,
  createAcademicYear,
  createClass,
  createClassesBulk,
  createEvent,
  createGradeComponent,
  deleteGradeComponent,
  createGuardian,
  createGuardiansBulk,
  createInvoice,
  createOccurrence,
  createStudent,
  createStudentsBulk,
  createSubject,
  createSubjectsBulk,
  createTerm,
  createUnit,
  deleteClass,
  deleteEvent,
  deleteInvoice,
  deleteOccurrence,
  deleteStudent,
  generateMonthlyInvoices,
  inviteMember,
  markInvoicePaid,
  reopenInvoice,
  linkClassSubject,
  linkGuardian,
  removeTeachingAssignment,
  restoreClass,
  restoreEvent,
  restoreStudent,
  unlinkClassSubject,
  unlinkGuardian,
  getConversation,
  getTenantSettings,
  getWhatsappConnection,
  recordAudit,
  canBroadcast,
  recordBroadcast,
  BROADCAST_MAX_RECIPIENTS,
  listGuardians,
  listInvoices,
  markConversationRead,
  recordOutgoingMessage,
  updateClassDetails,
  upsertTenantSettings,
} from '@on-education/module-nucleo';
import {
  addQuizQuestion,
  adaptActivityWithWayOn,
  approveActivity,
  awardPoints,
  deleteStudentPoint,
  copyFromCollective,
  createActivity,
  duplicateActivity,
  createMaterial,
  createPortfolioEntry,
  createQuiz,
  deleteActivity,
  deleteMaterial,
  deleteQuiz,
  getActivity,
  setActivitySchedule,
  updateActivity,
  generateActivityWithWayOn,
  generateFlashcardsWithWayOn,
  deleteFlashcardDeck,
  getFlashcardDeck,
  setFlashcardCardImage,
  generateQuizWithWayOn,
  restoreActivity,
  shareToCollective,
  submitQuizAttempt,
} from '@on-education/module-pedagogico';
import {
  createLesson,
  createLessonPlan,
  generateLessonPlanWithWayOn,
  createScheduleException,
  createScheduleSlot,
  deleteLessonPlan,
  createCurriculumUnit,
  deleteCurriculumUnit,
  deleteScheduleException,
  deleteScheduleSlot,
  distributeCurriculum,
  generateCurriculumWithWayOn,
  generateLessons,
  moveCurriculumUnit,
  recordAttendance,
  recordAttendanceBulk,
  recordGrade,
  setLessonStatus,
  updateCurriculumUnit,
} from '@on-education/module-sala-de-aula';
import {
  adaptActivitySchema,
  updateAiProviderSchema,
  addQuizQuestionSchema,
  assignTeachingSchema,
  createScheduleSlotSchema,
  createScheduleExceptionSchema,
  createCurriculumUnitSchema,
  updateCurriculumUnitSchema,
  generateCurriculumSchema,
  createLessonPlanSchema,
  generateLessonPlanSchema,
  createGradeComponentSchema,
  updateGradeScaleSchema,
  updateAiStandardSchema,
  linkClassSubjectSchema,
  linkGuardianSchema,
  updateClassSchema,
  createAcademicYearSchema,
  createActivitySchema,
  updateActivitySchema,
  createClassSchema,
  createMessageSchema,
  createOccurrenceSchema,
  createQuizSchema,
  generateActivitySchema,
  generateFlashcardsSchema,
  generateImageSchema,
  generateQuizSchema,
  submitQuizAttemptSchema,
  updateTenantSettingsSchema,
  createCommunicationSchema,
  createEventSchema,
  createGuardianSchema,
  createInvoiceSchema,
  createLessonSchema,
  generateMonthlyInvoicesSchema,
  shareCollectiveSchema,
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
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { parseCsvRecords, pick } from '@/lib/csv';
import { hojeISO } from '@/lib/date';
import { emailHtml, escapeHtml, isEmailConfigured, sendEmail } from '@/server/email';
import { buildClassMaterialsContext } from '@/server/materials-context';
import { buildReportText, buildStudentSummary } from '@/server/student-report';
import { db } from '@/server/db';
import { getAuthContext, signOut } from '@/server/session';
import {
  extractMaterialText,
  removeTenantFile,
  uploadPublicImagePng,
  uploadPublicLogo,
  uploadTenantFile,
} from '@/server/storage';
import { evoSendText, normalizePhone, whatsappConfigured } from '@/server/whatsapp';

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect('/login');
}

async function requireCtx(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

/**
 * Envia um texto pelo WhatsApp do tenant (Evolution), se conectado. No-op silencioso se o
 * canal não estiver configurado/ativo ou o número faltar. Devolve se entregou.
 */
async function sendWhatsappText(
  ctx: AuthContext,
  phone: string | null | undefined,
  text: string,
): Promise<boolean> {
  if (!whatsappConfigured() || !phone) return false;
  const conn = await getWhatsappConnection(db(), ctx);
  if (!conn?.active) return false;
  const r = await evoSendText(conn.instanceId, normalizePhone(phone), text);
  return r.ok && !r.noWhatsapp;
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
  const applyDate = (formData.get('applyDate') as string) || undefined;
  const input = createActivitySchema.parse({
    title: formData.get('title'),
    subject: (formData.get('subject') as string) || undefined,
    kind: (formData.get('kind') as string) || 'atividade',
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    ageBand: (formData.get('ageBand') as string) || undefined,
    applyDate,
    content: (formData.get('content') as string) || '',
    tags,
    aiGenerated: false,
    approved: true,
  });
  const act = await createActivity(db(), ctx, input);
  if (applyDate) await syncActivitySchedule(ctx, act.id, act.title, null, applyDate);
  revalidatePath('/app/atividades', 'page');
}

/** Cria/atualiza/remove o evento de calendário vinculado a uma atividade conforme a data. */
async function syncActivitySchedule(
  ctx: AuthContext,
  activityId: string,
  title: string,
  oldEventId: string | null,
  applyDate: string | null,
): Promise<void> {
  if (oldEventId) await deleteEvent(db(), ctx, oldEventId).catch(() => {});
  let eventId: string | null = null;
  if (applyDate) {
    const ev = await createEvent(db(), ctx, {
      title: title.slice(0, 200),
      date: applyDate,
      description: 'Aplicação agendada (WayOn)',
    });
    eventId = ev.id;
  }
  await setActivitySchedule(db(), ctx, activityId, applyDate, eventId);
}

/** Aprova o rascunho de atividade do WayOn (vai pro banco) e agenda no calendário se tiver data. */
export async function approveActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const act = await approveActivity(db(), ctx, id);
  if (act?.applyDate) await syncActivitySchedule(ctx, id, act.title, act.eventId, act.applyDate);
  revalidatePath('/app/atividades', 'page');
}

/** Edita uma atividade (título, matéria, classificação, conteúdo) + data de aplicação. */
export async function updateActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const applyDate = (formData.get('applyDate') as string) || null;
  const input = updateActivitySchema.parse({
    title: (formData.get('title') as string) || undefined,
    subject: (formData.get('subject') as string) || undefined,
    kind: (formData.get('kind') as string) || undefined,
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    ageBand: (formData.get('ageBand') as string) || undefined,
    content: (formData.get('content') as string) ?? undefined,
  });
  await updateActivity(db(), ctx, id, input);
  const act = await getActivity(db(), ctx, id);
  if (act) await syncActivitySchedule(ctx, id, act.title, act.eventId, applyDate);
  revalidatePath(`/app/atividades/${id}`, 'page');
}

/** Duplica uma atividade (reuso 1-clique, sem IA). A cópia abre direto pra edição. */
export async function duplicateActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const nova = await duplicateActivity(db(), ctx, id);
  revalidatePath('/app/atividades', 'page');
  if (nova) redirect(`/app/atividades/${nova.id}`);
}

/** Duplica e adapta uma atividade com o WayOn segundo a instrução do professor. */
export async function adaptActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = adaptActivitySchema.parse({
    sourceId: formData.get('sourceId'),
    instruction: formData.get('instruction'),
    kind: (formData.get('kind') as string) || undefined,
  });
  const nova = await adaptActivityWithWayOn(db(), ctx, input);
  revalidatePath('/app/atividades', 'page');
  if (nova) redirect(`/app/atividades/${nova.id}`);
}

/** Gera uma imagem pelo WayOn (gpt-image-1): checa cota, sobe pro storage e salva. */
export async function generateImageAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateImageSchema.parse({
    prompt: formData.get('prompt'),
    quality: (formData.get('quality') as string) || 'low',
    size: (formData.get('size') as string) || 'quadrado',
    frame: (formData.get('frame') as string) || 'padrao',
  });
  const { b64 } = await generateTenantImage(
    db(),
    ctx,
    input.prompt,
    input.quality,
    input.size,
    input.frame,
  );
  const url = await uploadPublicImagePng(ctx.tenantId, b64);
  await saveGeneratedImage(db(), ctx, { prompt: input.prompt, url, quality: input.quality });
  await recordImages(db(), ctx.tenantId, 1);
  revalidatePath('/app/ia/imagem', 'page');
}

export async function deleteGeneratedImageAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (id) await deleteGeneratedImage(db(), ctx, id);
  revalidatePath('/app/ia/imagem', 'page');
}

/** Gera um baralho de flashcards pelo WayOn e abre a tela de estudo. */
export async function generateFlashcardsAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateFlashcardsSchema.parse({
    topic: formData.get('topic'),
    subject: (formData.get('subject') as string) || undefined,
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    ageBand: (formData.get('ageBand') as string) || undefined,
    count: (formData.get('count') as string) || 10,
  });
  const deck = await generateFlashcardsWithWayOn(db(), ctx, input);
  revalidatePath('/app/ia/flashcards', 'page');
  redirect(`/app/ia/flashcards/${deck.id}`);
}

/** Gera e anexa uma ilustração (gpt-image-1) a um card do baralho — para a criança ver. */
export async function illustrateFlashcardCardAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const deckId = String(formData.get('deckId') ?? '');
  const index = Number(formData.get('index') ?? -1);
  if (!deckId || index < 0) return;
  const deck = await getFlashcardDeck(db(), ctx, deckId);
  const card = deck?.cards[index];
  if (!card) return;
  const prompt =
    `Ilustração simples, colorida e amigável para criança, representando: ${card.front}. ` +
    'Estilo de flashcard educativo, fundo branco, sem texto na imagem.';
  const { b64 } = await generateTenantImage(db(), ctx, prompt, 'low');
  const url = await uploadPublicImagePng(ctx.tenantId, b64);
  await recordImages(db(), ctx.tenantId, 1);
  await setFlashcardCardImage(db(), ctx, deckId, index, url);
  revalidatePath(`/app/ia/flashcards/${deckId}`, 'page');
}

export async function deleteFlashcardDeckAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (id) await deleteFlashcardDeck(db(), ctx, id);
  revalidatePath('/app/ia/flashcards', 'page');
}

/** Importa uma atividade de um arquivo (PDF/texto): extrai o conteúdo e salva no banco. */
export async function importActivityFileAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const content = (await extractMaterialText(bytes, file.type || null, file.name)) ?? '';
  const input = createActivitySchema.parse({
    title: (String(formData.get('title') ?? '').trim() || file.name).slice(0, 300),
    subject: (formData.get('subject') as string) || undefined,
    kind: (formData.get('kind') as string) || 'atividade',
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    ageBand: (formData.get('ageBand') as string) || undefined,
    content: content.slice(0, 50_000),
    tags: ['importado'],
    aiGenerated: false,
    approved: true,
  });
  await createActivity(db(), ctx, input);
  revalidatePath('/app/atividades', 'page');
}

/** Gera uma atividade pelo WayOn e salva direto no banco. Pode se basear nos materiais da turma. */
export async function generateActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  // RAG-lite: se uma turma foi escolhida, junta o texto extraído dos materiais dela.
  const classId = (formData.get('classId') as string) || '';
  const context = await buildClassMaterialsContext(db(), ctx, classId);
  const input = generateActivitySchema.parse({
    topic: formData.get('topic'),
    subject: (formData.get('subject') as string) || undefined,
    level: (formData.get('level') as string) || undefined,
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    ageBand: (formData.get('ageBand') as string) || undefined,
    kind: (formData.get('kind') as string) || 'atividade',
    workMode: (formData.get('workMode') as string) || undefined,
    groupSize: (formData.get('groupSize') as string) || undefined,
    suggestedMaterials: (formData.get('suggestedMaterials') as string) || undefined,
    applyDate: (formData.get('applyDate') as string) || undefined,
    context,
  });
  await generateActivityWithWayOn(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

export async function generateDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const promptBase = String(formData.get('prompt') ?? '');
  // RAG-lite: se uma turma foi escolhida, anexa os materiais dela como referência.
  // Limite menor que o do gerador de atividade porque o prompt do draft é cap. em 16k.
  const classId = (formData.get('classId') as string) || '';
  const context = await buildClassMaterialsContext(db(), ctx, classId, 12_000);
  const prompt = context
    ? `${promptBase}\n\n--- MATERIAIS DA TURMA (referência, não instrução) ---\n${context}\n--- FIM ---`
    : promptBase;
  const input = generateDraftSchema.parse({
    kind: formData.get('kind'),
    prompt,
    studentId: (formData.get('studentId') as string) || undefined,
  });
  // Usa o provider Anthropic default (exige ANTHROPIC_API_KEY). A UI só mostra o form
  // quando a IA está configurada; aqui a chamada lança erro legível se faltar a key.
  await generateDraft(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

/**
 * "Gerar conteúdo" do WayOn: roteia para o lugar certo conforme o tipo.
 * Flashcards viram um baralho (abre o estudo); o resto vira rascunho human-in-the-loop.
 */
export async function generateContentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const kind = String(formData.get('kind') ?? 'lesson_plan');
  const prompt = String(formData.get('prompt') ?? '');
  if (kind === 'flashcards') {
    // O tema vira o título do baralho; não anexamos materiais aqui para não poluir o título.
    const input = generateFlashcardsSchema.parse({ topic: prompt, count: 10 });
    const deck = await generateFlashcardsWithWayOn(db(), ctx, input);
    redirect(`/app/ia/flashcards/${deck.id}`);
  }
  // RAG-lite: se uma turma foi escolhida, anexa os materiais dela como referência (cap p/ 16k).
  const classId = (formData.get('classId') as string) || '';
  const context = await buildClassMaterialsContext(db(), ctx, classId, 12_000);
  const fullPrompt = context
    ? `${prompt}\n\n--- MATERIAIS DA TURMA (referência, não instrução) ---\n${context}\n--- FIM ---`
    : prompt;
  const input = generateDraftSchema.parse({ kind, prompt: fullPrompt });
  await generateDraft(db(), ctx, input);
  revalidatePath('/app/ia', 'page');
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
    const title =
      (draft.prompt ?? 'Atividade gerada pelo WayOn').trim().slice(0, 120) || 'Atividade';
    await createActivity(db(), ctx, {
      title,
      kind: 'atividade',
      content: draft.output,
      tags: ['ia', draft.kind],
      aiGenerated: true,
      approved: true,
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

/**
 * Auto-pontos (opt-in): se a gamificação estiver ligada e `autoPointsGrade > 0`, premia o aluno
 * ao registrar uma boa nota formal (>= 60% da escala). No-op silencioso fora dessas condições.
 */
async function maybeAutoAwardPoints(
  ctx: AuthContext,
  studentId: string,
  kind: string,
  value: number | null | undefined,
): Promise<void> {
  if (kind !== 'formal' || value === null || value === undefined) return;
  const s = await getTenantSettings(db(), ctx).catch(() => null);
  if (!s?.gamificationEnabled) return;
  const pts = s.autoPointsGrade ?? 0;
  if (pts <= 0) return;
  const scale = s.gradeScale ?? 10;
  if (value >= 0.6 * scale) {
    await awardPoints(db(), ctx, { studentId, points: pts, reason: 'Boa nota' }).catch(() => {});
  }
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
  await recordAudit(db(), ctx, {
    action: 'grade.record',
    resource: 'grade',
    metadata: { studentId: input.studentId, label: input.label, value: input.value ?? null },
  });
  await maybeAutoAwardPoints(ctx, input.studentId, input.kind, input.value);
  revalidatePath('/app', 'layout');
}

/**
 * Lança em lote as notas vindas da correção por foto. Recebe `items` (JSON:
 * [{studentId, score, feedback}]) + label/turma/componente. Cada nota válida vira
 * um registro `formal` com o feedback do WayOn na observação. Decisão humana: só
 * grava o que o professor confirmou na tela.
 */
export async function lancarNotasCorrecaoAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const classId = (formData.get('classId') as string) || undefined;
  const label = String(formData.get('label') ?? 'Correção').slice(0, 120) || 'Correção';
  const componentId = (formData.get('componentId') as string) || undefined;
  let items: { studentId?: string; score?: number; feedback?: string }[] = [];
  try {
    items = JSON.parse(String(formData.get('items') ?? '[]'));
  } catch {
    items = [];
  }
  for (const it of items) {
    if (!it?.studentId || typeof it.score !== 'number') continue;
    const input = recordGradeSchema.parse({
      studentId: it.studentId,
      classId,
      kind: 'formal',
      label,
      value: it.score,
      note: it.feedback ? String(it.feedback).slice(0, 2000) : undefined,
      componentId,
    });
    await recordGrade(db(), ctx, input);
    await maybeAutoAwardPoints(ctx, input.studentId, 'formal', input.value);
  }
  revalidatePath('/app', 'layout');
  redirect('/app/sala/notas');
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
  const id = String(formData.get('id'));
  await deleteClass(db(), ctx, id);
  await recordAudit(db(), ctx, { action: 'class.delete', resource: 'class', metadata: { id } });
  revalidatePath('/app', 'layout');
}

export async function deleteStudentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await deleteStudent(db(), ctx, id);
  await recordAudit(db(), ctx, { action: 'student.delete', resource: 'student', metadata: { id } });
  revalidatePath('/app', 'layout');
}

export async function deleteActivityAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  const act = await getActivity(db(), ctx, id).catch(() => null);
  if (act?.eventId) await deleteEvent(db(), ctx, act.eventId).catch(() => {});
  await deleteActivity(db(), ctx, id);
  revalidatePath('/app/atividades', 'page');
  redirect('/app/atividades');
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
  // Chamada simples: marca-se só quem FALTOU (absent_<id>); sem marca = presente.
  const entries = ids.map((id) => ({
    studentId: id,
    present: formData.get(`absent_${id}`) == null,
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
    kind: (formData.get('kind') as string) || 'evento',
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

// --- Banco de atividades coletivas (item 13) ---------------------------------

export async function shareCollectiveAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = shareCollectiveSchema.parse({
    activityId: formData.get('activityId'),
    ageRange: formData.get('ageRange'),
  });
  await shareToCollective(db(), ctx, input);
  revalidatePath('/app/banco-coletivo', 'page');
}

export async function copyCollectiveAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await copyFromCollective(db(), ctx, String(formData.get('id')));
  revalidatePath('/app', 'layout');
}

// --- Financeiro (cobranças / mensalidades) -----------------------------------

export async function createInvoiceAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createInvoiceSchema.parse({
    guardianId: (formData.get('guardianId') as string) || undefined,
    studentId: (formData.get('studentId') as string) || undefined,
    competencia: formData.get('competencia'),
    description: formData.get('description'),
    amount: formData.get('amount'),
    dueDate: formData.get('dueDate'),
  });
  await createInvoice(db(), ctx, input);
  revalidatePath('/app/financeiro', 'page');
}

export async function generateMonthlyInvoicesAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateMonthlyInvoicesSchema.parse({
    competencia: formData.get('competencia'),
    amount: formData.get('amount'),
    dueDate: formData.get('dueDate'),
    description: (formData.get('description') as string) || undefined,
  });
  await generateMonthlyInvoices(db(), ctx, input);
  revalidatePath('/app/financeiro', 'page');
}

export async function markInvoicePaidAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await markInvoicePaid(db(), ctx, id);
  await recordAudit(db(), ctx, { action: 'invoice.paid', resource: 'invoice', metadata: { id } });
  revalidatePath('/app/financeiro', 'page');
}

export async function reopenInvoiceAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await reopenInvoice(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/financeiro', 'page');
}

export async function deleteInvoiceAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  await deleteInvoice(db(), ctx, id);
  await recordAudit(db(), ctx, { action: 'invoice.delete', resource: 'invoice', metadata: { id } });
  revalidatePath('/app/financeiro', 'page');
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
    agentName: (formData.get('agentName') as string) || undefined,
  });
  await upsertTenantSettings(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

/** Configura a gamificação (liga/desliga + faixas de medalha). Checkbox enviado explicitamente. */
export async function updateGamificationAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = updateTenantSettingsSchema.parse({
    gamificationEnabled: formData.get('gamificationEnabled') === 'on',
    medalBronze: (formData.get('medalBronze') as string) || undefined,
    medalPrata: (formData.get('medalPrata') as string) || undefined,
    medalOuro: (formData.get('medalOuro') as string) || undefined,
  });
  await upsertTenantSettings(db(), ctx, input);
  revalidatePath('/app', 'layout');
}

/**
 * Upload da logo da escola: sobe o arquivo no bucket público e salva a URL na personalização.
 * Isolado do form grande de personalização. RBAC vem do `upsertTenantSettings` (gestão da escola).
 */
export async function uploadLogoAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  const logoUrl = await uploadPublicLogo(ctx.tenantId, file);
  await upsertTenantSettings(db(), ctx, { logoUrl });
  revalidatePath('/app', 'layout');
}

/** Sobe um material didático pra turma (bucket privado) e salva os metadados. */
export async function uploadMaterialAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const classId = String(formData.get('classId') ?? '');
  const file = formData.get('file');
  if (!classId || !(file instanceof File) || file.size === 0) return;
  const title = String(formData.get('title') ?? '').trim() || file.name;
  const subject = (formData.get('subject') as string)?.trim() || undefined;
  const up = await uploadTenantFile(ctx.tenantId, classId, file);
  await createMaterial(db(), ctx, {
    classId,
    title,
    subject,
    storagePath: up.path,
    fileName: up.fileName,
    mimeType: up.mimeType ?? undefined,
    sizeBytes: up.sizeBytes,
    extractedText: up.extractedText,
  });
  revalidatePath('/app', 'layout');
}

export async function deleteMaterialAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const path = await deleteMaterial(db(), ctx, id);
  if (path) await removeTenantFile(path);
  revalidatePath('/app', 'layout');
}

/** Sobe um MODELO de referência ("Meu padrão"): extrai o texto e salva no tenant. */
export async function uploadStandardSampleAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  const title = (String(formData.get('title') ?? '').trim() || file.name).slice(0, 200);
  const kind = (String(formData.get('kind') ?? 'outro') || 'outro').slice(0, 20);
  const up = await uploadTenantFile(ctx.tenantId, '_padrao', file);
  await createStandardSample(db(), ctx, {
    title,
    kind,
    fileName: up.fileName,
    storagePath: up.path,
    extractedText: up.extractedText,
  });
  revalidatePath('/app/meu-padrao', 'page');
}

export async function deleteStandardSampleAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const path = await deleteStandardSample(db(), ctx, id);
  if (path) await removeTenantFile(path).catch(() => {});
  revalidatePath('/app/meu-padrao', 'page');
}

// --- BYOK: IA do professor (provedor + chave própria) ------------------------

/** Salva o provedor de IA do tenant + a chave DELE (criptografada). 'default' limpa a chave. */
export async function updateAiProviderAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = updateAiProviderSchema.parse({
    aiProvider: (formData.get('aiProvider') as string) || 'default',
    apiKey: (formData.get('apiKey') as string) || undefined,
  });
  if (input.aiProvider === 'default') {
    await upsertTenantSettings(db(), ctx, { aiProvider: 'default', aiApiKeyEnc: null });
  } else {
    const patch: { aiProvider: 'anthropic' | 'openai' | 'gemini'; aiApiKeyEnc?: string } = {
      aiProvider: input.aiProvider,
    };
    // Só re-criptografa se o professor digitou uma chave nova (senão mantém a atual).
    if (input.apiKey?.trim()) patch.aiApiKeyEnc = encryptSecret(input.apiKey.trim());
    await upsertTenantSettings(db(), ctx, patch);
  }
  // Cookie flash: testa a chave de verdade com uma geração mínima.
  let msg = 'IA atualizada.';
  if (input.aiProvider !== 'default') {
    try {
      const p = await resolveTenantProvider(db(), ctx);
      await p.generate({ prompt: 'responda apenas: ok', maxTokens: 5 });
      msg = 'Chave validada — a IA do professor está ativa. ✅';
    } catch {
      msg = 'Salvo, mas a chave falhou no teste. Confira o provedor e a chave.';
    }
  }
  (await cookies()).set('oe_ai_flash', msg, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/app/meu-padrao',
    maxAge: 30,
  });
  redirect('/app/meu-padrao');
}

// --- Meu padrão / padrão do WayOn (item 18.3) --------------------------------

export async function updateAiStandardAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = updateAiStandardSchema.parse({
    aiStandard: (formData.get('aiStandard') as string) ?? '',
    imageStyle: (formData.get('imageStyle') as string) ?? '',
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
  // Envio individual no WhatsApp (sem risco de ban) quando marcado e o canal está ativo.
  if (formData.get('sendWhatsapp') === 'on') {
    const g = (await listGuardians(db(), ctx)).find((x) => x.id === input.guardianId);
    await sendWhatsappText(ctx, g?.phone, `*${input.subject}*\n\n${input.body ?? ''}`).catch(
      () => false,
    );
  }
  revalidatePath('/app/mensagens', 'page');
}

/**
 * Envia um comunicado no WhatsApp para TODOS os responsáveis com telefone (LOTE).
 * Sequencial (sem paralelizar) para reduzir risco de ban; a UI alerta antes de disparar.
 */
async function setWaFlash(msg: string): Promise<void> {
  (await cookies()).set('oe_wa_flash', msg, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/app/comunicados',
    maxAge: 30,
  });
}

export async function broadcastComunicadoWhatsappAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();

  // Anti-ban 1: respeita o cooldown entre envios em lote do tenant.
  const gate = await canBroadcast(db(), ctx);
  if (!gate.ok) {
    const horas = Math.ceil(gate.retryAfterMs / (60 * 60 * 1000));
    await setWaFlash(
      `Envio em lote bloqueado: aguarde ~${horas}h desde o último para proteger o número de bloqueio pela Meta.`,
    );
    revalidatePath('/app/comunicados', 'page');
    return;
  }

  const title = String(formData.get('title') ?? '');
  const body = String(formData.get('body') ?? '');
  const text = `*${title}*\n\n${body}`;

  const all = (await listGuardians(db(), ctx)).filter((g) => g.phone);
  // Anti-ban 2: limita destinatários por disparo.
  const targets = all.slice(0, BROADCAST_MAX_RECIPIENTS);

  let sent = 0;
  for (let i = 0; i < targets.length; i++) {
    const ok = await sendWhatsappText(ctx, targets[i]!.phone, text).catch(() => false);
    if (ok) sent++;
    // Anti-ban 3: espaçamento com jitter entre mensagens (exceto a última).
    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 800 + Math.floor((i * 137) % 1000)));
    }
  }

  await recordBroadcast(db(), ctx);
  const sobra = all.length - targets.length;
  await setWaFlash(
    `Comunicado enviado a ${sent}/${targets.length} responsável(is).` +
      (sobra > 0
        ? ` ${sobra} ficaram de fora do limite de ${BROADCAST_MAX_RECIPIENTS}; reenvie depois do cooldown.`
        : ''),
  );
  revalidatePath('/app/comunicados', 'page');
}

/** Envia um comunicado por E-MAIL a todos os responsáveis com e-mail (informativo em massa). */
export async function broadcastComunicadoEmailAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  if (!isEmailConfigured()) {
    await setWaFlash('E-mail não configurado. Adicione RESEND_API_KEY no Vercel.');
    revalidatePath('/app/comunicados', 'page');
    return;
  }
  const title = String(formData.get('title') ?? '');
  const body = String(formData.get('body') ?? '');
  const html = emailHtml(title, `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`);

  const comEmail = (await listGuardians(db(), ctx)).filter((g) => g.email);
  const targets = comEmail.slice(0, 300);
  let sent = 0;
  for (const g of targets) {
    // Um e-mail por responsável (privacidade: ninguém vê o e-mail dos outros).
    const r = await sendEmail({ to: g.email!, subject: title, html });
    if (r.ok) sent++;
  }
  await setWaFlash(
    `Comunicado enviado por e-mail a ${sent}/${targets.length} responsável(is).` +
      (comEmail.length > targets.length ? ` (limite de 300 por envio)` : ''),
  );
  revalidatePath('/app/comunicados', 'page');
}

/** Responde uma conversa do inbox: envia no WhatsApp e registra a mensagem enviada. */
export async function replyWhatsappAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const conversationId = String(formData.get('conversationId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!conversationId || !body) return;
  const conv = await getConversation(db(), ctx, conversationId);
  if (!conv) return;
  const sent = await sendWhatsappText(ctx, conv.phone, body).catch(() => false);
  if (sent) await recordOutgoingMessage(db(), ctx, conversationId, body);
  await markConversationRead(db(), ctx, conversationId);
  revalidatePath(`/app/whatsapp/inbox/${conversationId}`, 'page');
}

/** Cobra um responsável inadimplente no WhatsApp (lembrete do total vencido). Individual. */
export async function cobrarInadimplenteWhatsappAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const guardianId = String(formData.get('guardianId') ?? '');
  if (!guardianId) return;
  const g = (await listGuardians(db(), ctx)).find((x) => x.id === guardianId);
  if (!g?.phone) return;
  const hoje = hojeISO();
  const vencidas = (await listInvoices(db(), ctx)).filter(
    (i) => i.guardianId === guardianId && i.status === 'aberto' && i.dueDate < hoje,
  );
  const totalCents = vencidas.reduce((s, i) => s + i.amountCents, 0);
  if (totalCents <= 0) return;
  const reais = (totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const text =
    `Olá! Consta um valor em aberto de ${reais} referente a ${vencidas.length} ` +
    `mensalidade(s). Se já pagou, desconsidere. Qualquer dúvida, estamos à disposição.`;
  await sendWhatsappText(ctx, g.phone, text).catch(() => false);
  revalidatePath('/app/inadimplencia', 'page');
}

// --- Gamificação: pontos do aluno -------------------------------------------

export async function awardPointsAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const studentId = String(formData.get('studentId') ?? '');
  const points = Number(formData.get('points') ?? 0);
  const reason = (formData.get('reason') as string) || undefined;
  if (!studentId || !Number.isFinite(points) || points <= 0) return;
  await awardPoints(db(), ctx, { studentId, points, reason });
  revalidatePath(`/app/alunos/${studentId}`, 'page');
}

export async function deleteStudentPointAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  const studentId = String(formData.get('studentId') ?? '');
  if (id) await deleteStudentPoint(db(), ctx, id);
  if (studentId) revalidatePath(`/app/alunos/${studentId}`, 'page');
}

// --- Relatório do aluno aos pais --------------------------------------------

/** WayOn escreve um recado aos pais com base nos números do aluno; guarda em cookie p/ revisar. */
export async function escreverRecadoPaisAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const studentId = String(formData.get('studentId') ?? '');
  const notes = (formData.get('notes') as string) || undefined;
  if (!studentId) return;
  const resumo = await buildStudentSummary(db(), ctx, studentId);
  if (!resumo) return;
  const recado = await writeParentNote(db(), ctx, {
    studentName: resumo.studentName,
    average: resumo.average,
    attendance: resumo.attendance,
    gradeLines: resumo.gradeLines,
    notes,
  });
  (await cookies()).set('oe_report_msg', recado, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: `/app/alunos/${studentId}/relatorio`,
    maxAge: 1800,
  });
  redirect(`/app/alunos/${studentId}/relatorio`);
}

/** Envia o relatório do aluno (números + recado opcional) no WhatsApp de um responsável. */
export async function enviarRelatorioWhatsappAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const studentId = String(formData.get('studentId') ?? '');
  const guardianId = String(formData.get('guardianId') ?? '');
  const recado = (formData.get('recado') as string) || null;
  if (!studentId || !guardianId) return;
  const resumo = await buildStudentSummary(db(), ctx, studentId);
  if (!resumo) return;
  const g = (await listGuardians(db(), ctx)).find((x) => x.id === guardianId);
  if (!g?.phone) return;
  const texto = buildReportText(resumo, recado);
  const ok = await sendWhatsappText(ctx, g.phone, texto).catch(() => false);
  (await cookies()).set(
    'oe_report_flash',
    ok
      ? `Relatório enviado a ${g.fullName}.`
      : 'Falha ao enviar (verifique o WhatsApp conectado e o telefone).',
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: `/app/alunos/${studentId}/relatorio`,
      maxAge: 30,
    },
  );
  redirect(`/app/alunos/${studentId}/relatorio`);
}

/** Envia o relatório do aluno por E-MAIL a um responsável (números + recado opcional). */
export async function enviarRelatorioEmailAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const studentId = String(formData.get('studentId') ?? '');
  const guardianId = String(formData.get('guardianId') ?? '');
  const recado = (formData.get('recado') as string) || null;
  if (!studentId || !guardianId) return;
  const resumo = await buildStudentSummary(db(), ctx, studentId);
  if (!resumo) return;
  const g = (await listGuardians(db(), ctx)).find((x) => x.id === guardianId);
  if (!g?.email) return;

  const linhasNotas = resumo.gradeLines.length
    ? `<p><b>Notas</b><br>${resumo.gradeLines.map((l) => escapeHtml(l.replace(/^- /, ''))).join('<br>')}</p>`
    : '';
  const recadoHtml = recado ? `<p>${escapeHtml(recado).replace(/\n/g, '<br>')}</p>` : '';
  const html = emailHtml(
    `Relatório de ${resumo.studentName}`,
    `<p>Média: <b>${resumo.average}</b> · Frequência: <b>${resumo.attendance}</b></p>${linhasNotas}${recadoHtml}`,
  );
  const r = await sendEmail({ to: g.email, subject: `Relatório de ${resumo.studentName}`, html });
  (await cookies()).set(
    'oe_report_flash',
    r.ok ? `Relatório enviado por e-mail a ${g.fullName}.` : `Falha ao enviar: ${r.error ?? ''}`,
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: `/app/alunos/${studentId}/relatorio`,
      maxAge: 30,
    },
  );
  redirect(`/app/alunos/${studentId}/relatorio`);
}

// --- API aberta -------------------------------------------------------------

export async function createApiKeyAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const name = String(formData.get('name') ?? '').trim();
  const { key } = await createApiKey(db(), ctx, name);
  // Mostra o valor UMA vez via cookie curto (httpOnly), depois some.
  (await cookies()).set('oe_apikey_flash', key, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/app/api',
    maxAge: 120,
  });
  redirect('/app/api');
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  if (id) await revokeApiKey(db(), ctx, id);
  revalidatePath('/app/api', 'page');
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteMessage(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/mensagens', 'page');
}

/** Gera um simulado completo pelo WayOn e abre o resultado para revisão. */
export async function generateQuizAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateQuizSchema.parse({
    topic: formData.get('topic'),
    subject: (formData.get('subject') as string) || undefined,
    level: (formData.get('level') as string) || undefined,
    count: Number(formData.get('count') ?? 5),
  });
  const quiz = await generateQuizWithWayOn(db(), ctx, input);
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

/** Gera um plano completo com o WayOn e já salva no planejamento da turma. */
export async function generateLessonPlanAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const classId = String(formData.get('classId') ?? '');
  // RAG-lite: usa os materiais da própria turma como referência do plano.
  const context = await buildClassMaterialsContext(db(), ctx, classId);
  const input = generateLessonPlanSchema.parse({
    classId,
    subjectId: (formData.get('subjectId') as string) || undefined,
    kind: (formData.get('kind') as string) || 'aula',
    topic: formData.get('topic'),
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    durationMin: (formData.get('durationMin') as string) || undefined,
    useBncc: formData.get('useBncc') === 'on' || formData.get('useBncc') === 'true',
    bncc: (formData.get('bncc') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    context,
  });
  await generateLessonPlanWithWayOn(db(), ctx, input);
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

/**
 * Motor de aulas previstas: gera o diário automático da turma no intervalo, cruzando o
 * cronograma com os dias letivos. Idempotente; regeneração só mexe no futuro.
 */
export async function generateLessonsAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const classId = String(formData.get('classId') ?? '');
  const from = String(formData.get('from') ?? '');
  const to = String(formData.get('to') ?? '');
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (!classId || !ymd.test(from) || !ymd.test(to) || from > to) {
    redirect(`/app/cronograma?classId=${classId}&gen=erro`);
  }
  const r = await generateLessons(db(), ctx, { classId, from, to, today: hojeISO() });
  revalidatePath('/app/sala/diario', 'page');
  revalidatePath('/app/cronograma', 'page');
  redirect(`/app/cronograma?classId=${classId}&gen=${r.created}.${r.removed}.${r.slots}`);
}

/** Marca uma aula do diário: dada (com tema), cancelada (com motivo) ou volta a prevista. */
export async function markLessonAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as 'prevista' | 'dada' | 'cancelada';
  if (!id || !['prevista', 'dada', 'cancelada'].includes(status)) return;
  await setLessonStatus(db(), ctx, id, {
    status,
    topic: (formData.get('topic') as string) || undefined,
    cancelReason: (formData.get('cancelReason') as string) || undefined,
  });
  revalidatePath('/app/sala/diario', 'page');
}

// --- Plano de curso / sequência didática (ponto 3) ---------------------------
function planoCursoQuery(formData: FormData): string {
  const classId = String(formData.get('classId') ?? '');
  const subjectId = (formData.get('subjectId') as string) || '';
  return `?classId=${classId}${subjectId ? `&subjectId=${subjectId}` : ''}`;
}

export async function createCurriculumUnitAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = createCurriculumUnitSchema.parse({
    classId: formData.get('classId'),
    subjectId: (formData.get('subjectId') as string) || undefined,
    title: formData.get('title'),
    content: (formData.get('content') as string) || undefined,
    lessonsPlanned: formData.get('lessonsPlanned') ?? 1,
  });
  await createCurriculumUnit(db(), ctx, input);
  revalidatePath('/app/sala/plano-curso', 'page');
  redirect(`/app/sala/plano-curso${planoCursoQuery(formData)}`);
}

export async function updateCurriculumUnitAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = updateCurriculumUnitSchema.parse({
    id: formData.get('id'),
    title: (formData.get('title') as string) || undefined,
    content: (formData.get('content') as string) || undefined,
    lessonsPlanned: (formData.get('lessonsPlanned') as string) || undefined,
  });
  await updateCurriculumUnit(db(), ctx, input);
  revalidatePath('/app/sala/plano-curso', 'page');
  redirect(`/app/sala/plano-curso${planoCursoQuery(formData)}`);
}

export async function deleteCurriculumUnitAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteCurriculumUnit(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/sala/plano-curso', 'page');
  redirect(`/app/sala/plano-curso${planoCursoQuery(formData)}`);
}

export async function moveCurriculumUnitAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const dir = formData.get('dir') === 'up' ? 'up' : 'down';
  await moveCurriculumUnit(db(), ctx, String(formData.get('id')), dir);
  revalidatePath('/app/sala/plano-curso', 'page');
  redirect(`/app/sala/plano-curso${planoCursoQuery(formData)}`);
}

export async function generateCurriculumAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const input = generateCurriculumSchema.parse({
    classId: formData.get('classId'),
    subjectId: (formData.get('subjectId') as string) || undefined,
    subject: formData.get('subject'),
    gradeLevel: (formData.get('gradeLevel') as string) || undefined,
    totalLessons: (formData.get('totalLessons') as string) || undefined,
    useBncc: formData.get('useBncc') ?? false,
    notes: (formData.get('notes') as string) || undefined,
  });
  await generateCurriculumWithWayOn(db(), ctx, input);
  revalidatePath('/app/sala/plano-curso', 'page');
  redirect(`/app/sala/plano-curso${planoCursoQuery(formData)}`);
}

export async function distributeCurriculumAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const classId = String(formData.get('classId') ?? '');
  const subjectId = (formData.get('subjectId') as string) || null;
  const r = await distributeCurriculum(db(), ctx, { classId, subjectId, today: hojeISO() });
  revalidatePath('/app/sala/plano-curso', 'page');
  revalidatePath('/app/sala/diario', 'page');
  redirect(`/app/sala/plano-curso${planoCursoQuery(formData)}&dist=${r.assigned}.${r.leftover}`);
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
