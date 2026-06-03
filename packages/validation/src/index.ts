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
});
export type IndividualSignupInput = z.infer<typeof individualSignupSchema>;

export const createClassSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const createStudentSchema = z.object({
  fullName: z.string().min(1).max(200),
  classId: uuidSchema.optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/** Banco de atividades (Fase 1B.3). */
export const createActivitySchema = z.object({
  title: z.string().min(1).max(300),
  subject: z.string().max(120).optional(),
  content: z.string().max(50_000).default(''),
  tags: z.array(z.string().min(1).max(40)).max(30).default([]),
  aiGenerated: z.boolean().default(false),
});
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = createActivitySchema.partial();
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export const searchActivitiesSchema = z.object({
  q: z.string().max(300).optional(),
  tag: z.string().max(40).optional(),
});
export type SearchActivitiesInput = z.infer<typeof searchActivitiesSchema>;

/** IA pedagógica (Fase 1B.2) — pedido de geração de rascunho. */
export const aiDraftKindSchema = z.enum(['lesson_plan', 'activity', 'essay', 'tutor']);
export type AiDraftKind = z.infer<typeof aiDraftKindSchema>;

export const generateDraftSchema = z.object({
  kind: aiDraftKindSchema,
  prompt: z.string().min(1).max(10_000),
});
export type GenerateDraftInput = z.infer<typeof generateDraftSchema>;

/** Fase 1A — escola (organization). */
export const organizationSignupSchema = z.object({
  ownerEmail: emailSchema,
  ownerName: z.string().min(2).max(200),
  schoolName: z.string().min(2).max(200),
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
  date: z.string().date(),
  topic: z.string().min(1).max(300),
  notes: z.string().max(5000).optional(),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const recordGradeSchema = z.object({
  studentId: uuidSchema,
  classId: uuidSchema.optional(),
  subjectId: uuidSchema.optional(),
  termId: uuidSchema.optional(),
  label: z.string().min(1).max(120),
  value: z.coerce.number().min(0).max(100),
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

/** Comunicação — comunicados. */
export const createCommunicationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(20_000).default(''),
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
});
export type CreatePortfolioEntryInput = z.infer<typeof createPortfolioEntrySchema>;

/** Calendário — eventos. */
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  date: z.string().date(),
  time: z.string().max(10).optional(),
  classId: uuidSchema.optional(),
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
});
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;

/** Mensagem interna para um responsável (Fase 1A.3). */
export const createMessageSchema = z.object({
  guardianId: uuidSchema,
  studentId: uuidSchema.optional(),
  subject: z.string().min(1).max(200),
  body: z.string().max(5000).default(''),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

/** Geração de simulado pelo EduON (IA). */
export const generateQuizSchema = z.object({
  topic: z.string().min(2).max(300),
  subject: z.string().max(120).optional(),
  level: z.string().max(120).optional(),
  count: z.number().int().min(1).max(15).default(5),
});
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;

/** Geração de atividade pelo EduON (IA), direto no banco. */
export const generateActivitySchema = z.object({
  topic: z.string().min(2).max(300),
  subject: z.string().max(120).optional(),
  level: z.string().max(120).optional(),
});
export type GenerateActivityInput = z.infer<typeof generateActivitySchema>;
