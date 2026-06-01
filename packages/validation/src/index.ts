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
  /** Nome do workspace; default derivável do nome do professor se ausente. */
  workspaceName: z.string().min(2).max(200).optional(),
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
export const aiDraftKindSchema = z.enum(['lesson_plan', 'activity']);
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
