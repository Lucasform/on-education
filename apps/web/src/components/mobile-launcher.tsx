'use client';

import type { TenantType } from '@on-education/core';

import { navFor } from '@/lib/nav';

import { AppGrid } from './app-grid';

/**
 * Launcher da home no mobile: todas as áreas do app como ícones grandes. Client component
 * porque os ícones (componentes) não serializam de server→client; aqui montamos via navFor.
 */
export function MobileLauncher({ tenantType }: { tenantType: TenantType }) {
  return <AppGrid groups={navFor(tenantType)} />;
}
