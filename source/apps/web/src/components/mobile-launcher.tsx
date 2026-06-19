'use client';

import type { TenantType } from '@on-education/core';
import type { Feature } from '@on-education/entitlements';

import { navFor } from '@/lib/nav';

import { AppGrid } from './app-grid';

/**
 * Launcher da home no mobile: todas as áreas do app como ícones grandes. Client component
 * porque os ícones (componentes) não serializam de server→client; aqui montamos via navFor.
 * `features` = funcionalidades do plano (pra marcar o cadeado nos itens bloqueados).
 */
export function MobileLauncher({
  tenantType,
  features,
}: {
  tenantType: TenantType;
  features?: readonly Feature[] | null;
}) {
  // Na própria home, o atalho "Início" (/app) apontaria para esta mesma página: remove para
  // não virar um ícone que não leva a lugar nenhum. (No menu em tela cheia ele continua útil.)
  const groups = navFor(tenantType, features)
    .map((g) => ({ ...g, items: g.items.filter((i) => i.href !== '/app') }))
    .filter((g) => g.items.length > 0);
  return <AppGrid groups={groups} />;
}
