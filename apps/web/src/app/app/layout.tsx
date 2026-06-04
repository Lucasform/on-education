import { SubmitButton } from '@/components/submit-button';
import { getTenantSettings } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { exitImpersonationAction } from '@/app/admin/actions';
import { AppShell } from '@/components/app-shell';
import { db } from '@/server/db';
import { getAuthContext, isImpersonating } from '@/server/session';

import { logoutAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const impersonating = await isImpersonating();
  // Personalização da escola (logo + cor do tema). Falha não pode derrubar o app.
  const settings = await getTenantSettings(db(), ctx).catch(() => null);

  const headerActions = impersonating ? (
    <form action={exitImpersonationAction}>
      <SubmitButton type="submit" variant="outline" size="sm">
        Sair do modo admin
      </SubmitButton>
    </form>
  ) : (
    <form action={logoutAction}>
      <SubmitButton type="submit" variant="outline" size="sm">
        Sair
      </SubmitButton>
    </form>
  );

  // Aplica a cor do tema da escola (triplo HSL) como --primary em todo o app.
  const themeStyle = settings?.themeColor
    ? `:root{--primary:${settings.themeColor};--ring:${settings.themeColor}}`
    : null;

  return (
    <>
      {themeStyle && <style dangerouslySetInnerHTML={{ __html: themeStyle }} />}
      <AppShell
        tenantType={ctx.tenantType}
        subtitle={ctx.tenantType === 'organization' ? 'Escola' : 'Professor'}
        logoUrl={settings?.logoUrl ?? null}
        headerActions={headerActions}
      >
        {children}
      </AppShell>
    </>
  );
}
