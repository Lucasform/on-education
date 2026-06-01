import type { Role } from '@on-education/core';

import type { AuthContext } from './context';

/**
 * Esqueleto de RBAC (Master Spec §6.2). Autorização = papel × recurso × ação × escopo,
 * COMPLEMENTADA por checagem de entitlement (em @on-education/entitlements) e RLS (banco).
 * Esta é a camada de "regra"; não substitui as outras duas pernas da checagem tripla.
 *
 * Fase 0: matriz mínima. Expandir por módulo conforme os deliveries.
 */
export type Action = 'create' | 'read' | 'update' | 'delete';

/** Papéis com poder amplo dentro do tenant (atalho de leitura para o esqueleto). */
const FULL_ACCESS_ROLES: readonly Role[] = ['owner', 'director'];

export function can(ctx: AuthContext, action: Action, _resource: string): boolean {
  if (ctx.roles.some((r) => FULL_ACCESS_ROLES.includes(r))) return true;
  // Default mais restritivo: sem regra específica, só leitura é liberada (Master Spec §7.4).
  return action === 'read';
}

/** Lança se a ação não for permitida. Use nas fronteiras de API/serviço. */
export function assertCan(ctx: AuthContext, action: Action, resource: string): void {
  if (!can(ctx, action, resource)) {
    throw new Error(`Acesso negado: ${action} em ${resource}.`);
  }
}
