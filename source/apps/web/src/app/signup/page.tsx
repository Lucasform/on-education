import Link from 'next/link';

import { AuthSubmit } from '@/components/auth-submit';
import {
  AuthField,
  authGhostBtn,
  authInput,
  BrandAuthScreen,
  SlugInputField,
} from '@/components/brand-auth-screen';
import { ConsentNote } from '@/components/consent-note';

import { signupAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar conta · Edu On Way' };

const ERROS: Record<string, string> = {
  existe: 'Este e-mail já tem conta. Faça login ou use outro e-mail.',
  senha: 'A senha precisa ter ao menos 8 caracteres.',
  config: 'Não foi possível criar o acesso (configuração do servidor). Já estamos verificando.',
  falha: 'Não foi possível criar a conta agora. Tente novamente em instantes.',
  link: 'Link inválido. Use só letras minúsculas, números e hífen (3 a 40 caracteres).',
  linkuso: 'Esse link já está em uso. Escolha outro.',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <BrandAuthScreen
      title="Criar sua conta"
      subtitle="Sua área de trabalho de professor, pronta para usar em minutos."
      footer={
        <div className="flex flex-col gap-1.5">
          <span>
            Já tem conta?{' '}
            <Link
              href="/login"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </span>
          <span>
            É uma escola?{' '}
            <Link
              href="/signup/escola"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Cadastrar escola
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

      <form action={signupAction} className="flex flex-col gap-3">
        <AuthField label="Seu nome">
          <input name="ownerName" required minLength={2} placeholder="Como você assina" className={authInput} />
        </AuthField>
        <AuthField label="E-mail">
          <input name="ownerEmail" type="email" required placeholder="seu@email.com" className={authInput} />
        </AuthField>
        <AuthField label="Senha" hint="(mín. 8 caracteres)">
          <input name="password" type="password" required minLength={8} placeholder="Crie uma senha" className={authInput} />
        </AuthField>
        <AuthField label="Nome do seu espaço" hint="(você, empresa ou projeto)">
          <input
            name="workspaceName"
            required
            minLength={2}
            placeholder="Ex.: Profª Ana · Reforço de Matemática"
            className={authInput}
          />
        </AuthField>
        <SlugInputField placeholder="prof-ana" />
        <AuthSubmit pendingLabel="Criando conta…">Criar conta</AuthSubmit>
        <ConsentNote />
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-white/50">
        <span className="h-px flex-1 bg-white/20" />
        ou
        <span className="h-px flex-1 bg-white/20" />
      </div>

      <Link href="/signup/email" className={authGhostBtn}>
        Criar com um link no e-mail
      </Link>
    </BrandAuthScreen>
  );
}
