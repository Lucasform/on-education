import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';
import { getAuthContext, getSuperAdminEmail } from '@/server/session';

import { loginAction, magicLinkAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar · Edu On Way' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; magic?: string }>;
}) {
  // Já autenticado? Não mostra o login de novo: leva ao destino certo.
  const [ctx, adminEmail] = await Promise.all([getAuthContext(), getSuperAdminEmail()]);
  if (ctx) redirect('/app');
  if (adminEmail) redirect('/admin');

  const { erro, magic } = await searchParams;

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse sua área de trabalho."
      footer={
        <>
          Não tem conta?{' '}
          <a
            href="/signup"
            className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Criar conta
          </a>
        </>
      }
    >
      {erro && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          E-mail ou senha inválidos. Tente novamente.
        </p>
      )}
      {magic === 'enviado' && (
        <p className="mb-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-center text-sm text-success">
          Link enviado! Confira seu e-mail e clique para entrar.
        </p>
      )}
      {magic === 'erro' && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          Não foi possível enviar o link. Confira o e-mail e tente de novo.
        </p>
      )}
      <form action={loginAction} className="flex flex-col gap-4">
        <Field label="E-mail">
          <input name="email" type="email" required className={fieldClass} />
        </Field>
        <Field label="Senha">
          <input name="password" type="password" required className={fieldClass} />
        </Field>
        <div className="text-right">
          <a
            href="/esqueci-senha"
            className="rounded-sm text-xs text-muted-foreground outline-none underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Esqueci a senha
          </a>
        </div>
        <Button type="submit" className="mt-2 w-full">
          Entrar
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={magicLinkAction} className="flex flex-col gap-3">
        <input type="hidden" name="mode" value="login" />
        <Field label="Entre com seu e-mail" hint="(enviamos um link de acesso)">
          <input name="email" type="email" required placeholder="seu@email.com" className={fieldClass} />
        </Field>
        <Button type="submit" variant="outline" className="w-full">
          Receber link de acesso
        </Button>
      </form>
    </AuthShell>
  );
}
