/**
 * Tenancy — coração do modelo multi-tenant (Master Spec §3).
 * `organization` = escola/rede (muitos membros). `individual` = professor autônomo (um membro).
 * O segmento NÃO muda o código: muda tenant_type + plano + entitlements.
 */
export const TENANT_TYPES = ['organization', 'individual'] as const;
export type TenantType = (typeof TENANT_TYPES)[number];

/** UUID v4 como string; alias semântico para clareza de domínio. */
export type Uuid = string;
export type TenantId = Uuid;
export type UserId = Uuid;
