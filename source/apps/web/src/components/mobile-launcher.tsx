'use client';

import type { TenantType } from '@on-education/core';

import { navFor } from '@/lib/nav';

import { AppGrid } from './app-grid';

/**
 * Launcher da home no mobile: todas as áreas do app como ícones grandes. Client component
 * porque os ícones (componentes) não serializam de server→client; aqui montamos via navFor.
 */
export function MobileLauncher({ tenantType }: { tenantType: TenantType }) {
  // Na própria home, o atalho "Início" (/app) apontaria para esta mesma página: remove para
  // não virar um ícone que não leva a lugar nenhum. (No menu em tela cheia ele continua útil.)
  const groups = navFor(tenantType)
    .map((g) => ({ ...g, items: g.items.filter((i) => i.href !== '/app') }))
    .filter((g) => g.items.length > 0);
  return <AppGrid groups={groups} />;
}
