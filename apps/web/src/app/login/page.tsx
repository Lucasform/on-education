import { Button } from '@on-education/ui';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';

import { loginAction } from './actions';

export const metadata = { title: 'Entrar · On Education' };

export default function LoginPage() {
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
