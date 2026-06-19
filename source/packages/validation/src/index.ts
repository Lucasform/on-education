import { ROLES, TENANT_TYPES } from '@on-education/core';
import { z } from 'zod';

/**
 * Schemas Zod compartilhados client+server (Master Spec §4.1, §12).
 * Reusam os enums de domínio do core para não duplicar a fonte da verdade.
 */
export const uuidSchema = z.string().uuid();

export const tenantTypeSchema = z.enum(TENANT_TYPES);
export const roleSchema = z.enum(ROLES);

/** Identidade mínima de tenant ao criar (o tenant_id real é gerado pelo banco). */
export const createTenantSchema = z.object({
  name: z.string().min(2).max(200),
  tenantType: tenantTypeSchema,
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const emailSchema = z.string().email().max(320);

/** Signup self-service do professor autônomo (Fase 1B.1). Cria um tenant `individual`. */
export const individualSignupSchema = z.object({
  ownerEmail: emailSchema,
  ownerName: z.string().min(2).max(200),
  /** Nome do workspace (obrigatório no cadastro). */
  workspaceName: z.string().min(2).max(200),
  /** Link público opcional (já normalizado/validado pela action). */
  slug: z.string().max(40).optional(),
});
export type IndividualSignupInput = z.infer<typeof individualSignupSchema>;

export const createClassSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  gradeLevel: z.string().max(60).optional(),
  ageRange: z.string().max(60).optional(),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

/** Edição dos detalhes da turma (série/faixa etária/descrição) — item 3. */
export const updateClassSchema = z.object({
  classId: uuidSchema,
  description: z.string().max(2000).optional(),
  gradeLevel: z.string().max(60).optional(),
  ageRange: z.string().max(60).optional(),
});
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

/** Vínculo turma↔matéria (item 3.2). */
export const linkClassSubjectSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema,
});
export type LinkClassSubjectInput = z.infer<typeof linkClassSubjectSchema>;

export const createStudentSchema = z.object({
  fullName: z.string().min(1).max(200),
  classId: uuidSchema.optional(),
  birthDate: z.string().date().optional(),
  cpf: z.string().max(20).optional(),
  rg: z.string().max(30).optional(),
  gender: z.string().max(20).optional(),
  nationality: z.string().max(60).optional(),
  shift: z.string().max(20).optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/** Banco de atividades (Fase 1B.3). */
export const activityKindSchema = z.enum(['atividade', 'prova', 'trabalho', 'roteiro']);

export const createActivitySchema = z.object({
  title: z.string().min(1).max(300),
  subject: z.string().max(120).optional(),
  kind: activityKindSchema.default('atividade'),
  gradeLevel: z.string().max(60).optional(),
  ageBand: z.string().max(20).optional(),
  applyDate: z.string().date().optional(),
  content: z.string().max(50_000).default(''),
  tags: z.array(z.string().min(1).max(40)).max(30).default([]),
  aiGenerated: z.boolean().default(false),
  approved: z.boolean().default(true),
});
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = createActivitySchema.partial();
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export const generateImageSchema = z.object({
  prompt: z.string().min(3).max(1000),
  quality: z.enum(['low', 'medium', 'high']).default('low'),
  size: z.enum(['quadrado', 'horizontal', 'vertical']).default('quadrado'),
  frame: z.enum(['padrao', 'centralizado', 'preenchido']).default('padrao'),
});
export type GenerateImageInput = z.infer<typeof generateImageSchema>;

export const generateFlashcardsSchema = z.object({
  topic: z.string().min(2).max(300),
  subject: z.string().max(120).optional(),
  gradeLevel: z.string().max(60).optional(),
  ageBand: z.string().max(20).optional(),
  count: z.coerce.number().int().min(3).max(30).default(10),
});
export type GenerateFlashcardsInput = z.infer<typeof generateFlashcardsSchema>;

/** Adaptar/remixar uma atividade existente com o WayOn (reuso 1-clique). */
export const adaptActivitySchema = z.object({
  sourceId: z.string().uuid(),
  instruction: z.string().min(2).max(600),
  // Opcionalmente muda o tipo do documento (ex.: vira uma prova).
  kind: activityKindSchema.optional(),
});
export type AdaptActivityInput = z.infer<typeof adaptActivitySchema>;

export const searchActivitiesSchema = z.object({
  q: z.string().max(300).optional(),
  tag: z.string().max(40).optional(),
  subject: z.string().max(120).optional(),
  kind: z.string().max(20).optional(),
  gradeLevel: z.string().max(60).optional(),
  ageBand: z.string().max(20).optional(),
  approved: z.boolean().optional(),
});
export type SearchActivitiesInput = z.infer<typeof searchActivitiesSchema>;

/** IA pedagógica (Fase 1B.2) — pedido de geração de rascunho. */
export const aiDraftKindSchema = z.enum(['lesson_plan', 'activity', 'essay', 'tutor', 'outro']);
export type AiDraftKind = z.infer<typeof aiDraftKindSchema>;

export const generateDraftSchema = z.object({
  kind: aiDraftKindSchema,
  prompt: z.string().min(1).max(16_000),
  studentId: z.string().uuid().optional(),
});
export type GenerateDraftInput = z.infer<typeof generateDraftSchema>;

/** Fase 1A — escola (organization). */
export const organizationSignupSchema = z.object({
  ownerEmail: emailSchema,
  ownerName: z.string().min(2).max(200),
  schoolName: z.string().min(2).max(200),
  /** Link público opcional (já normalizado/validado pela action). */
  slug: z.string().max(40).optional(),
});
export type OrganizationSignupInput = z.infer<typeof organizationSignupSchema>;

export const createUnitSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: roleSchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(10).max(200),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

/** Fase 1A.1b — estrutura acadêmica + responsáveis. */
export const createAcademicYearSchema = z.object({
  name: z.string().min(1).max(50),
  startsOn: z.string().date().optional(),
  endsOn: z.string().date().optional(),
});
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

export const createTermSchema = z.object({
  academicYearId: uuidSchema,
  name: z.string().min(1).max(100),
});
export type CreateTermInput = z.infer<typeof createTermSchema>;

export const createSubjectSchema = z.object({
  name: z.string().min(1).max(120),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

/** Item 17 — vínculo do professor (membership ↔ turma ↔ matéria). */
export const assignTeachingSchema = z.object({
  membershipId: uuidSchema,
  classId: uuidSchema,
  /** Vazio = regente da turma (todas as matérias). */
  subjectId: uuidSchema.optional(),
});
export type AssignTeachingInput = z.infer<typeof assignTeachingSchema>;

export const createGuardianSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: emailSchema.optional(),
  phone: z.string().max(40).optional(),
  cpf: z.string().max(20).optional(),
  rg: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  profession: z.string().max(120).optional(),
});
export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;

export const linkGuardianSchema = z.object({
  studentId: uuidSchema,
  guardianId: uuidSchema,
  relation: z.string().max(60).optional(),
  isFinancial: z.boolean().default(false),
  canPickup: z.boolean().default(false),
  isEmergency: z.boolean().default(false),
});
export type LinkGuardianInput = z.infer<typeof linkGuardianSchema>;

/** Fase 1A.2 — sala de aula. */
export const createLessonSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema.optional(),
  lessonPlanId: uuidSchema.optional(),
  date: z.string().date(),
  topic: z.string().min(1).max(300),
  notes: z.string().max(5000).optional(),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

/** Planejamento (itens 7.1/7.3): plano de aula, avaliação ou trabalho. */
export const lessonPlanKindSchema = z.enum(['aula', 'avaliacao', 'trabalho']);
export type LessonPlanKind = z.infer<typeof lessonPlanKindSchema>;

export const createLessonPlanSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema.optional(),
  kind: lessonPlanKindSchema.default('aula'),
  title: z.string().min(1).max(300),
  content: z.string().max(20_000).optional(),
  date: z.string().date().optional(),
});
export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>;

/** Geração de plano de aula/avaliação/trabalho pelo WayOn (item 7.1). */
export const generateLessonPlanSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema.optional(),
  kind: lessonPlanKindSchema.default('aula'),
  topic: z.string().min(2).max(300),
  gradeLevel: z.string().max(60).optional(),
  durationMin: z.coerce.number().int().min(10).max(600).optional(),
  // BNCC é OPCIONAL e personalizável: liga/desliga + habilidade específica colável.
  useBncc: z.coerce.boolean().default(false),
  bncc: z.string().max(600).optional(),
  notes: z.string().max(1000).optional(),
  // RAG-lite: texto dos materiais da turma, usado como referência (não é instrução).
  context: z.string().max(60_000).optional(),
});
export type GenerateLessonPlanInput = z.infer<typeof generateLessonPlanSchema>;

export const gradeKindSchema = z.enum(['formal', 'participacao', 'anotacao']);
export type GradeKind = z.infer<typeof gradeKindSchema>;

export const recordGradeSchema = z
  .object({
    studentId: uuidSchema,
    classId: uuidSchema.optional(),
    subjectId: uuidSchema.optional(),
    termId: uuidSchema.optional(),
    kind: gradeKindSchema.default('formal'),
    label: z.string().min(1).max(120),
    /** Nulo para anotações (observação sem nota). */
    value: z.coerce.number().min(0).max(1000).optional(),
    note: z.string().max(2000).optional(),
    /** Componente da média (Prova/Trabalho...). Vazio = componente padrão (peso 1). */
    componentId: uuidSchema.optional(),
  })
  .refine((d) => d.kind === 'anotacao' || d.value !== undefined, {
    message: 'Informe a nota para avaliação ou participação.',
    path: ['value'],
  });
export type RecordGradeInput = z.infer<typeof recordGradeSchema>;

export const recordAttendanceSchema = z.object({
  studentId: uuidSchema,
  classId: uuidSchema,
  subjectId: uuidSchema.optional(),
  date: z.string().date(),
  present: z.coerce.boolean(),
});
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;

/** Cronograma/horário semanal da turma (item 7). */
export const createScheduleSlotSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema.optional(),
  weekday: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use o formato HH:MM'),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Use o formato HH:MM')
    .optional()
    .or(z.literal('')),
  note: z.string().max(200).optional(),
});
export type CreateScheduleSlotInput = z.infer<typeof createScheduleSlotSchema>;

/** Alteração pontual do cronograma numa data específica (item 7). */
export const createScheduleExceptionSchema = z.object({
  classId: uuidSchema,
  date: z.string().date(),
  note: z.string().min(1).max(200),
});
export type CreateScheduleExceptionInput = z.infer<typeof createScheduleExceptionSchema>;

/** Plano de curso / sequência didática (ponto 3): unidade da ementa de uma matéria. */
export const createCurriculumUnitSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema.optional(),
  title: z.string().min(1).max(200),
  content: z.string().max(10_000).optional(),
  lessonsPlanned: z.coerce.number().int().min(1).max(200).default(1),
});
export type CreateCurriculumUnitInput = z.infer<typeof createCurriculumUnitSchema>;

export const updateCurriculumUnitSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(10_000).optional(),
  lessonsPlanned: z.coerce.number().int().min(1).max(200).optional(),
});
export type UpdateCurriculumUnitInput = z.infer<typeof updateCurriculumUnitSchema>;

/** Geração da ementa (lista de unidades) pelo WayOn. */
export const generateCurriculumSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema.optional(),
  subject: z.string().min(2).max(120),
  gradeLevel: z.string().max(60).optional(),
  totalLessons: z.coerce.number().int().min(1).max(400).optional(),
  useBncc: z.coerce.boolean().default(false),
  notes: z.string().max(1000).optional(),
});
export type GenerateCurriculumInput = z.infer<typeof generateCurriculumSchema>;

/** Comunicação — comunicados. classId = segmentado p/ turma; undefined = geral. */
export const createCommunicationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(20_000).default(''),
  classId: z.string().uuid().optional(),
});
export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;

export const generateCommunicationSchema = z.object({
  prompt: z.string().min(1).max(2000),
});
export type GenerateCommunicationInput = z.infer<typeof generateCommunicationSchema>;

/** Pedagógico — portfólio do aluno. */
export const createPortfolioEntrySchema = z.object({
  studentId: uuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  fileUrl: z.string().url().max(600).optional(),
});
export type CreatePortfolioEntryInput = z.infer<typeof createPortfolioEntrySchema>;

/** Calendário — eventos. */
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  date: z.string().date(),
  time: z.string().max(10).optional(),
  classId: uuidSchema.optional(),
  // Calendário escolar: evento normal | feriado | recesso (estes dois = dias não letivos).
  kind: z.enum(['evento', 'feriado', 'recesso']).optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

/** Simulados/Quizzes (Fase 1B.3). */
export const createQuizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().max(120).optional(),
});
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const addQuizQuestionSchema = z.object({
  quizId: uuidSchema,
  prompt: z.string().min(1).max(2000),
  options: z.array(z.string().min(1).max(500)).min(2).max(8),
  correctIndex: z.number().int().min(0),
});
export type AddQuizQuestionInput = z.infer<typeof addQuizQuestionSchema>;

export const submitQuizAttemptSchema = z.object({
  quizId: uuidSchema,
  studentName: z.string().max(200).optional(),
  answers: z.array(z.number().int().min(0)),
});
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;

/** Banco de atividades coletivas (item 13) — compartilhar atividade por faixa etária. */
export const ageRangeSchema = z.enum(['EI', 'EF1', 'EF2', 'EM', 'outro']);
export type AgeRange = z.infer<typeof ageRangeSchema>;
export const shareCollectiveSchema = z.object({
  activityId: uuidSchema,
  ageRange: ageRangeSchema.default('outro'),
});
export type ShareCollectiveInput = z.infer<typeof shareCollectiveSchema>;

/** Financeiro 2.a (item 5.1) — cobrança/mensalidade. `amount` em reais (vira centavos). */
export const createInvoiceSchema = z.object({
  guardianId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM'),
  description: z.string().min(1).max(200),
  amount: z.coerce.number().min(0).max(1_000_000),
  dueDate: z.string().date(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/** Recorrência — gerar mensalidades da competência em lote. */
export const generateMonthlyInvoicesSchema = z.object({
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM'),
  amount: z.coerce.number().min(0).max(1_000_000),
  dueDate: z.string().date(),
  description: z.string().max(200).optional(),
});
export type GenerateMonthlyInvoicesInput = z.infer<typeof generateMonthlyInvoicesSchema>;

/** Ocorrências do aluno (Fase 1A) — vinculável a 1 ou vários alunos. */
export const createOccurrenceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  date: z.string().date(),
  severity: z.enum(['leve', 'media', 'grave']).default('leve'),
  studentIds: z.array(uuidSchema).min(1),
});
export type CreateOccurrenceInput = z.infer<typeof createOccurrenceSchema>;

/** Personalização da escola (Fase 1A). */
export const updateTenantSettingsSchema = z.object({
  logoUrl: z.string().url().max(2000).optional().or(z.literal('')),
  themeColor: z.string().max(40).optional(),
  regimento: z.string().max(50_000).optional(),
  docTemplates: z.string().max(50_000).optional(),
  aiStandard: z.string().max(10_000).optional(),
  imageStyle: z.string().max(2000).optional(),
  agentName: z.string().max(40).optional(),
  gradeScale: z.coerce.number().int().min(1).max(1000).optional(),
  gamificationEnabled: z.coerce.boolean().optional(),
  medalBronze: z.coerce.number().int().min(1).max(100_000).optional(),
  medalPrata: z.coerce.number().int().min(1).max(100_000).optional(),
  medalOuro: z.coerce.number().int().min(1).max(100_000).optional(),
  autoPointsGrade: z.coerce.number().int().min(0).max(1000).optional(),
  // BYOK: provedor de IA do tenant + chave já criptografada (a action cuida da cripto).
  aiProvider: z.enum(['default', 'anthropic', 'openai', 'gemini']).optional(),
  aiApiKeyEnc: z.string().nullable().optional(),
  // Perfil público
  profileName: z.string().max(120).optional(),
  profilePhone: z.string().max(30).optional(),
  profileEmail: z.string().email().max(200).optional().or(z.literal('')),
  profileAddress: z.string().max(300).optional(),
  profileCnpj: z.string().max(20).optional(),
});

/** BYOK: escolha do provedor + chave crua (criptografada na action). */
export const updateAiProviderSchema = z.object({
  aiProvider: z.enum(['default', 'anthropic', 'openai', 'gemini']),
  apiKey: z.string().max(400).optional(),
});
export type UpdateAiProviderInput = z.infer<typeof updateAiProviderSchema>;

/** Composição da média (pesos) definida pela escola. */
export const createGradeComponentSchema = z.object({
  name: z.string().min(1).max(80),
  weight: z.coerce.number().min(0).max(100).default(1),
});
export type CreateGradeComponentInput = z.infer<typeof createGradeComponentSchema>;

export const updateGradeScaleSchema = z.object({
  gradeScale: z.coerce.number().int().min(1).max(1000),
});
export type UpdateGradeScaleInput = z.infer<typeof updateGradeScaleSchema>;

/** "Meu padrão" do WayOn (item 18.3) — só o campo do padrão. */
export const updateAiStandardSchema = z.object({
  aiStandard: z.string().max(10_000).optional(),
  imageStyle: z.string().max(2000).optional(),
});
export type UpdateAiStandardInput = z.infer<typeof updateAiStandardSchema>;
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;

/** Mensagem interna para um responsável (Fase 1A.3). */
export const createMessageSchema = z.object({
  guardianId: uuidSchema,
  studentId: uuidSchema.optional(),
  subject: z.string().min(1).max(200),
  body: z.string().max(5000).default(''),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

/** Geração de simulado pelo WayOn (IA). */
export const generateQuizSchema = z.object({
  topic: z.string().min(2).max(300),
  subject: z.string().max(120).optional(),
  level: z.string().max(120).optional(),
  count: z.number().int().min(1).max(15).default(5),
});
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;

/** Geração de atividade pelo WayOn (IA), direto no banco. */
export const generateActivitySchema = z.object({
  topic: z.string().min(2).max(1500),
  subject: z.string().max(120).optional(),
  level: z.string().max(120).optional(),
  kind: z.enum(['atividade', 'prova', 'trabalho', 'roteiro']).default('atividade'),
  gradeLevel: z.string().max(60).optional(),
  ageBand: z.string().max(20).optional(),
  // Específicos de "trabalho": modo (individual/grupo), tamanho do grupo e materiais sugeridos.
  workMode: z.enum(['individual', 'grupo']).optional(),
  groupSize: z.coerce.number().int().min(2).max(20).optional(),
  suggestedMaterials: z.string().max(2000).optional(),
  applyDate: z.string().date().optional(),
  // Texto dos materiais da turma para o WayOn se basear (RAG-lite).
  context: z.string().max(60_000).optional(),
});
export type GenerateActivityInput = z.infer<typeof generateActivitySchema>;
