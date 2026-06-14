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

/** Papéis com poder amplo dentro do tenant: gerenciam tudo da escola (inclui excluir). */
const FULL_ACCESS_ROLES: readonly Role[] = ['owner', 'director', 'vice_director', 'coordinator'];

/** Recursos pedagógicos do dia a dia que o professor pode criar/editar/excluir na sua org. */
const TEACHING_RESOURCES: readonly string[] = [
  'class',
  'student',
  'lesson',
  'grade',
  'attendance',
  'activity',
  'ai_draft',
  'portfolio',
  'event',
  'communication',
  'quiz',
  'message',
  'occurrence',
  'material',
];

/**
 * Matriz de autorização (Master Spec §6.2). Default mais restritivo: sem regra, só leitura.
 * O super-admin do app NÃO passa por aqui (opera via /admin, fora do contexto de tenant).
 */
export function can(ctx: AuthContext, action: Action, resource: string): boolean {
  // Decisão de produto: EXCLUIR é exclusivo do dono. Nenhum outro papel apaga dados da conta
  // (membros, alunos, turmas, atividades). Num tenant `individual` o professor é o owner,
  // então ele segue podendo excluir o que é dele. A impersonação do super-admin também tem owner.
  if (action === 'delete') return ctx.roles.includes('owner');
  if (ctx.roles.some((r) => FULL_ACCESS_ROLES.includes(r))) return true;
  if (ctx.roles.includes('teacher') && TEACHING_RESOURCES.includes(resource)) return true;
  return action === 'read';
}

/** Lança se a ação não for permitida. Use nas fronteiras de API/serviço. */
export function assertCan(ctx: AuthContext, action: Action, resource: string): void {
  if (!can(ctx, action, resource)) {
    throw new Error(`Acesso negado: ${action} em ${resource}.`);
  }
}
