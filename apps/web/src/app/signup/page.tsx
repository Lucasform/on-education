import { Button } from '@on-education/ui';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';

import { signupAction } from './actions';

export const metadata = { title: 'Criar conta · On Education' };

export default function SignupPage() {
  return (
    <AuthShell
      title="Criar sua conta de professor"
      subtitle="Workspace pessoal gratuito. Valor já no primeiro uso."
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
        <Field label="Nome do workspace">
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
