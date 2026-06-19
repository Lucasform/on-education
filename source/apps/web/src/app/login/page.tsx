import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthSubmit } from '@/components/auth-submit';
import { authGhostBtn, authInput, BrandAuthScreen } from '@/components/brand-auth-screen';
import { getAuthContext, getSuperAdminEmail } from '@/server/session';

import { loginAction } from './actions';

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
    <BrandAuthScreen
      title="Entrar"
      subtitle="Acesse a sua área de trabalho."
      footer={
        <>
          Não tem conta?{' '}
          <Link
            href="/signup"
            className="font-semibold text-white underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </>
      }
    >
      {erro && (
        <p className="mb-3 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2 text-center text-sm text-red-50">
          E-mail ou senha inválidos. Tente novamente.
        </p>
      )}
      {magic === 'expirado' && (
        <p className="mb-3 rounded-xl border border-amber-200/40 bg-amber-400/20 px-3 py-2 text-center text-sm text-amber-50">
          Esse link já foi usado ou expirou. Entre de novo abaixo.
        </p>
      )}

      <form action={loginAction} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="E-mail" className={authInput} />
        <input
          name="password"
          type="password"
          required
          placeholder="Senha"
          className={authInput}
        />
        <AuthSubmit pendingLabel="Entrando…">Entrar</AuthSubmit>
        <Link
          href="/esqueci-senha"
          className="mt-1 text-center text-xs text-white/70 underline-offset-4 hover:text-white hover:underline"
        >
          Esqueci a senha
        </Link>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-white/50">
        <span className="h-px flex-1 bg-white/20" />
        ou
        <span className="h-px flex-1 bg-white/20" />
      </div>

      <Link href="/login/email" className={authGhostBtn}>
        Entrar com um link no e-mail
      </Link>
    </BrandAuthScreen>
  );
}
