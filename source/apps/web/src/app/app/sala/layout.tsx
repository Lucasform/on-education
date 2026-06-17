import { isEntitled } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/form';
import { UpgradeGate } from '@/components/upgrade-gate';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Sala de aula (diário, chamada, notas, faltas, boletim, planejamento) começa no Professor Pro. */
export default async function SalaLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (!(await isEntitled(db(), ctx.tenantId, 'classes.manage'))) {
    return (
      <>
        <PageHeader title="Sala de aula" description="Diário, chamada, notas, faltas e boletim." />
        <UpgradeGate feature="classes.manage" tenantType={ctx.tenantType} />
      </>
    );
  }
  return <>{children}</>;
}
