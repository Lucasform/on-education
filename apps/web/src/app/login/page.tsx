import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';
import { getAuthContext, getSuperAdminEmail } from '@/server/session';

import { loginAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar · On Education' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  // Já autenticado? Não mostra o login de novo: leva ao destino certo.
  const [ctx, adminEmail] = await Promise.all([getAuthContext(), getSuperAdminEmail()]);
  if (ctx) redirect('/app');
  if (adminEmail) redirect('/admin');

  const { erro } = await searchParams;

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse seu workspace."
      footer={
        <>
          Não tem conta?{' '}
          <a href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Criar conta
          </a>
        </>
      }
    >
      {erro && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          E-mail ou senha inválidos. Tente novamente.
        </p>
      )}
      <form action={loginAction} className="flex flex-col gap-4">
        <Field label="E-mail">
          <input name="email" type="email" required className={fieldClass} />
        </Field>
        <Field label="Senha">
          <input name="password" type="password" required className={fieldClass} />
        </Field>
        <Button type="submit" className="mt-2 w-full">
          Entrar
        </Button>
      </form>
    </AuthShell>
  );
}
