import Link from 'next/link';

import {
  AuthField,
  authInput,
  authPrimaryBtn,
  BrandAuthScreen,
  SlugInputField,
} from '@/components/brand-auth-screen';

import { signupSchoolAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar escola · Edu On Way' };

const ERROS: Record<string, string> = {
  existe: 'Este e-mail já tem conta. Faça login ou use outro e-mail.',
  senha: 'A senha precisa ter ao menos 8 caracteres.',
  config: 'Não foi possível criar o acesso (configuração do servidor). Já estamos verificando.',
  falha: 'Não foi possível criar a escola agora. Tente novamente em instantes.',
  link: 'Link inválido. Use só letras minúsculas, números e hífen (3 a 40 caracteres).',
  linkuso: 'Esse link já está em uso. Escolha outro.',
};

export default async function SchoolSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <BrandAuthScreen
      title="Cadastrar sua escola"
      subtitle="Cria a instituição, a unidade Sede e a sua conta de diretor(a)."
      footer={
        <div className="flex flex-col gap-1.5">
          <span>
            É professor(a)?{' '}
            <Link
              href="/signup"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </span>
          <span>
            Já tem conta?{' '}
            <Link
              href="/login"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </span>
        </div>
      }
    >
      {erro && (
        <p className="mb-3 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2 text-center text-sm text-red-50">
          {ERROS[erro] ?? ERROS.falha}
        </p>
      )}

      <form action={signupSchoolAction} className="flex flex-col gap-3">
        <AuthField label="Nome da escola">
          <input name="schoolName" required minLength={2} placeholder="Ex.: Colégio Horizonte" className={authInput} />
        </AuthField>
        <AuthField label="Seu nome">
          <input name="ownerName" required minLength={2} placeholder="Diretor(a) responsável" className={authInput} />
        </AuthField>
        <AuthField label="E-mail">
          <input name="ownerEmail" type="email" required placeholder="voce@escola.com" className={authInput} />
        </AuthField>
        <AuthField label="Senha" hint="(mín. 8 caracteres)">
          <input name="password" type="password" required minLength={8} placeholder="Crie uma senha" className={authInput} />
        </AuthField>
        <SlugInputField label="Link público da escola" placeholder="minha-escola" />
        <button type="submit" className={`${authPrimaryBtn} mt-1`}>
          Criar escola
        </button>
      </form>
    </BrandAuthScreen>
  );
}
