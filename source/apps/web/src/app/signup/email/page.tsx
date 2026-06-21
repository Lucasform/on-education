import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthSubmit } from '@/components/auth-submit';
import {
  AuthField,
  authInput,
  BrandAuthScreen,
  SlugInputField,
} from '@/components/brand-auth-screen';
import { ConsentNote } from '@/components/consent-note';
import { getAuthContext } from '@/server/session';

import { magicLinkAction } from '../../login/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar com e-mail · Edu On Way' };

export default async function SignupEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ magic?: string; em?: string }>;
}) {
  const ctx = await getAuthContext();
  if (ctx) redirect('/app');
  const { magic, em } = await searchParams;
  const enviado = magic === 'enviado';

  return (
    <BrandAuthScreen
      title={enviado ? 'Confira seu e-mail' : 'Criar com seu e-mail'}
      subtitle={
        enviado
          ? 'Falta um clique para abrir sua conta.'
          : 'Sem senha: enviamos um link e sua conta fica pronta.'
      }
      footer={
        <>
          Prefere senha?{' '}
          <Link href="/signup" className="font-semibold text-white underline-offset-4 hover:underline">
            Criar com senha
          </Link>
          <br />
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      {enviado ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 5L2 7" />
            </svg>
          </span>
          <p className="text-sm text-white/80">
            Enviamos um link de acesso
            {em ? (
              <>
                {' '}
                para <strong className="text-white">{em}</strong>
              </>
            ) : null}
            . Abra o e-mail e clique em{' '}
            <strong className="text-white">Entrar na minha conta</strong>.
          </p>
          <Link
            href="/signup/email"
            className="text-xs text-white/70 underline-offset-4 hover:text-white hover:underline"
          >
            Não chegou? Usar outro e-mail
          </Link>
        </div>
      ) : (
        <>
          {magic === 'erro' && (
            <p className="mb-3 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2 text-center text-sm text-red-50">
              Não foi possível enviar. Confira o e-mail e tente de novo.
            </p>
          )}

          <form action={magicLinkAction} className="flex flex-col gap-3">
            <input type="hidden" name="mode" value="signup" />
            <input type="hidden" name="returnTo" value="/signup/email" />
            <AuthField label="Seu nome">
              <input name="ownerName" required minLength={2} placeholder="Como você assina" className={authInput} />
            </AuthField>
            <AuthField label="Nome do seu espaço" hint="(você, empresa ou projeto)">
              <input name="workspaceName" required minLength={2} placeholder="Ex.: Profª Ana" className={authInput} />
            </AuthField>
            <AuthField label="E-mail">
              <input name="email" type="email" required placeholder="seu@email.com" className={authInput} />
            </AuthField>
            <SlugInputField placeholder="prof-ana" />
            <AuthSubmit pendingLabel="Enviando…">Criar com meu e-mail</AuthSubmit>
            <ConsentNote />
          </form>
        </>
      )}
    </BrandAuthScreen>
  );
}
