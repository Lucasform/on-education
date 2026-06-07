import { getPublicTenantBrand, getTenantSettings } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { exitImpersonationAction } from '@/app/admin/actions';
import { AppShell } from '@/components/app-shell';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext, isImpersonating } from '@/server/session';

import { logoutAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const impersonating = await isImpersonating();
  // Nome do tenant (workspace que o professor/escola escolheu): vai no topo e no banner de
  // impersonação. Conexão dona; falha não pode derrubar o app.
  const brand = await getPublicTenantBrand(db(), ctx.tenantId).catch(() => null);
  const workspaceName = brand?.name ?? null;
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
        subtitle={
          ctx.tenantType === 'organization'
            ? 'Escola'
            : workspaceName
              ? `Professor · ${workspaceName}`
              : 'Professor'
        }
        workspaceName={workspaceName}
        logoUrl={settings?.logoUrl ?? null}
        headerActions={headerActions}
      >
        {impersonating && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm">
            <span className="text-warning">
              <strong className="font-semibold">Modo admin.</strong> Você está vendo e editando como{' '}
              <strong className="font-semibold">{brand?.name ?? 'esta escola'}</strong>.
            </span>
            <form action={exitImpersonationAction}>
              <SubmitButton
                type="submit"
                size="sm"
                variant="outline"
                className="h-7 border-warning/40 px-2 text-xs"
              >
                Sair do modo admin
              </SubmitButton>
            </form>
          </div>
        )}
        {children}
      </AppShell>
    </>
  );
}
