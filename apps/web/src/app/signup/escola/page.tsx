import { Button } from '@on-education/ui';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';

import { signupSchoolAction } from './actions';

export const metadata = { title: 'Criar escola · On Education' };

export default function SchoolSignupPage() {
  return (
    <AuthShell
      title="Cadastrar sua escola"
      subtitle="Cria a instituição, a unidade Sede e sua conta de diretor(a)."
      footer={
        <>
          Já tem conta?{' '}
          <a href="/login" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </a>
        </>
      }
    >
      <form action={signupSchoolAction} className="flex flex-col gap-4">
        <Field label="Nome da escola">
          <input name="schoolName" required minLength={2} className={fieldClass} />
        </Field>
        <Field label="Seu nome">
          <input name="ownerName" required minLength={2} className={fieldClass} />
        </Field>
        <Field label="E-mail">
          <input name="ownerEmail" type="email" required className={fieldClass} />
        </Field>
        <Field label="Senha" hint="(mín. 8 caracteres)">
          <input name="password" type="password" required minLength={8} className={fieldClass} />
        </Field>
        <Button type="submit" className="mt-2 w-full">
          Criar escola
        </Button>
      </form>
    </AuthShell>
  );
}
