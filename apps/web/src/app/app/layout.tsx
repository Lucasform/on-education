import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { exitImpersonationAction } from '@/app/admin/actions';
import { AppShell } from '@/components/app-shell';
import { getAuthContext, isImpersonating } from '@/server/session';

import { logoutAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const impersonating = await isImpersonating();

  const headerActions = impersonating ? (
    <form action={exitImpersonationAction}>
      <Button type="submit" variant="outline" size="sm">
        Sair do modo admin
      </Button>
    </form>
  ) : (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        Sair
      </Button>
    </form>
  );

  return (
    <AppShell
      tenantType={ctx.tenantType}
      subtitle={ctx.tenantType === 'organization' ? 'Escola' : 'Professor'}
      headerActions={headerActions}
    >
      {children}
    </AppShell>
  );
}
