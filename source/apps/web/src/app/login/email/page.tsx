import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  authInput,
  authPrimaryBtn,
  BrandAuthScreen,
} from '@/components/brand-auth-screen';
import { SlugEntry } from '@/components/slug-entry';
import { getAuthContext } from '@/server/session';

import { magicLinkAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar com e-mail · Edu On Way' };

export default async function LoginEmailPage({
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
      title={enviado ? 'Confira seu e-mail' : 'Entrar com seu e-mail'}
      subtitle={
        enviado ? 'Falta um clique para entrar.' : 'Sem senha: enviamos um link de acesso.'
      }
      footer={
        <>
          Prefere senha?{' '}
          <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
            Entrar com senha
          </Link>
          <br />
          Não tem conta?{' '}
          <Link href="/signup" className="font-semibold text-white underline-offset-4 hover:underline">
            Criar conta
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
            href="/login/email"
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
            <input type="hidden" name="mode" value="login" />
            <input type="hidden" name="returnTo" value="/login/email" />
            <input name="email" type="email" required placeholder="Seu e-mail" className={authInput} />
            <button type="submit" className={`${authPrimaryBtn} mt-1`}>
              Receber link de acesso
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-white/50">
            <span className="h-px flex-1 bg-white/20" />
            ou pela sua escola
            <span className="h-px flex-1 bg-white/20" />
          </div>

          <SlugEntry />
        </>
      )}
    </BrandAuthScreen>
  );
}
