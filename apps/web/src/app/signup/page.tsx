import { Button } from '@on-education/ui';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';

import { signupAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar conta · Edu On Way' };

const ERROS: Record<string, string> = {
  existe: 'Este e-mail já tem conta. Faça login ou use outro e-mail.',
  senha: 'A senha precisa ter ao menos 8 caracteres.',
  config: 'Não foi possível criar o acesso (configuração do servidor). Já estamos verificando.',
  falha: 'Não foi possível criar a conta agora. Tente novamente em instantes.',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <AuthShell
      title="Criar sua conta de professor"
      subtitle="Sua área de trabalho pessoal gratuita. Valor já no primeiro uso."
      footer={
        <>
          É uma escola?{' '}
          <a
            href="/signup/escola"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Cadastrar escola
          </a>{' '}
          · Já tem conta?{' '}
          <a href="/login" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </a>
        </>
      }
    >
      {erro && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {ERROS[erro] ?? ERROS.falha}
        </p>
      )}
      <form action={signupAction} className="flex flex-col gap-4">
        <Field label="Seu nome">
          <input name="ownerName" required minLength={2} className={fieldClass} />
        </Field>
        <Field label="E-mail">
          <input name="ownerEmail" type="email" required className={fieldClass} />
        </Field>
        <Field label="Senha" hint="(mín. 8 caracteres)">
          <input name="password" type="password" required minLength={8} className={fieldClass} />
        </Field>
        <Field label="Nome da área de trabalho">
          <input
            name="workspaceName"
            required
            minLength={2}
            placeholder="Ex.: Aulas da Profª Ana"
            className={fieldClass}
          />
        </Field>
        <Button type="submit" className="mt-2 w-full">
          Criar conta
        </Button>
      </form>
    </AuthShell>
  );
}
