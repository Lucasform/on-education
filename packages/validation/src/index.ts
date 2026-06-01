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
