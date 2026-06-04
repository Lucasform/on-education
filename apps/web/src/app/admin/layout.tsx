import { redirect } from 'next/navigation';

import { logoutAction } from '@/app/app/actions';
import { AdminShell } from '@/components/admin-shell';
import { SubmitButton } from '@/components/submit-button';
import { getSuperAdminEmail } from '@/server/session';

export const dynamic = 'force-dynamic';

/**
 * Guarda do painel de super-admin. Só passa quem estiver logado no Supabase com
 * e-mail na allowlist `SUPER_ADMIN_EMAILS`. Sem allowlist configurada, ninguém entra.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await getSuperAdminEmail();
  if (!email) redirect('/login');
  return (
    <AdminShell
      email={email}
      headerActions={
        <form action={logoutAction}>
          <SubmitButton type="submit" variant="outline" size="sm">
            Sair
          </SubmitButton>
        </form>
      }
    >
      {children}
    </AdminShell>
  );
}
