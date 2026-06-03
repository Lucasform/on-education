/**
 * Papéis-base (Master Spec §6.2). Num tenant `individual` o `owner` acumula `teacher`.
 * Autorização real = papel × recurso × ação × escopo × entitlement (checagem tripla).
 */
export const ROLES = [
  'owner',
  'director',
  'coordinator',
  'teacher',
  'monitor',
  'staff_secretary',
  'staff_finance',
  'guardian',
  'student',
] as const;
export type Role = (typeof ROLES)[number];

/** Papéis com privilégio administrativo: exigem MFA (Master Spec §6.1). */
export const ADMIN_ROLES: readonly Role[] = [
  'owner',
  'director',
  'staff_secretary',
  'staff_finance',
];

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}
