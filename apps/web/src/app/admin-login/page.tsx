import { Button } from '@on-education/ui';
import { Shield } from 'lucide-react';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';
import { getSuperAdminEmail } from '@/server/session';

import { adminLoginAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acesso administrativo · On Way Education' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await getSuperAdminEmail()) redirect('/admin');
  const { erro } = await searchParams;

  return (
    <AuthShell
      title="Acesso administrativo"
      subtitle="Painel do produto. Restrito à equipe On Way Education."
    >
      <div className="mb-5 flex justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Shield className="h-6 w-6" />
        </span>
      </div>

      {erro && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro === 'naoadmin'
            ? 'Esta conta não tem acesso de administrador.'
            : 'E-mail ou senha inválidos. Tente novamente.'}
        </p>
      )}

      <form action={adminLoginAction} className="flex flex-col gap-4">
        <Field label="E-mail">
          <input name="email" type="email" required className={fieldClass} />
        </Field>
        <Field label="Senha">
          <input name="password" type="password" required className={fieldClass} />
        </Field>
        <Button type="submit" className="mt-2 w-full">
          Entrar no painel
        </Button>
      </form>
    </AuthShell>
  );
}
