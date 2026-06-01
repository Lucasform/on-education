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
