import type { Role, TenantId, TenantType, UserId } from '@on-education/core';

/**
 * Contexto de autenticação derivado da SESSÃO (Master Spec §6, §7.4).
 * O `tenantId` aqui é a única fonte autorizada de tenant — nunca aceitar tenant_id
 * vindo de parâmetro do client. É este valor que alimenta o RLS via `withTenant`.
 */
export interface AuthContext {
  userId: UserId;
  tenantId: TenantId;
  tenantType: TenantType;
  roles: Role[];
}

/**
 * Resolve o contexto a partir de uma sessão do provedor de auth (Supabase/Auth.js).
 * Esqueleto da Fase 0: a implementação real (lookup de membership no banco) entra no
 * delivery do Núcleo. Aqui validamos apenas a forma mínima.
 */
export function resolveAuthContext(input: Partial<AuthContext> | null): AuthContext {
  if (!input?.userId || !input.tenantId || !input.tenantType) {
    throw new Error('Sessão sem contexto de tenant: usuário não autenticado ou sem membership.');
  }
  return {
    userId: input.userId,
    tenantId: input.tenantId,
    tenantType: input.tenantType,
    roles: input.roles ?? [],
  };
}
