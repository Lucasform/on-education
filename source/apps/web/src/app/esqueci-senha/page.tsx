import { Button } from '@on-education/ui';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';

import { requestResetAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recuperar senha · Edu On Way' };

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviamos um link para você definir uma nova senha."
      footer={
        <a
          href="/login"
          className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          Voltar ao login
        </a>
      }
    >
      {status === 'enviado' ? (
        <p className="rounded-md border border-border bg-muted px-3 py-3 text-center text-sm text-muted-foreground">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira a
          caixa de entrada e o spam.
        </p>
      ) : (
        <form action={requestResetAction} className="flex flex-col gap-4">
          <Field label="E-mail da conta">
            <input name="email" type="email" required className={fieldClass} />
          </Field>
          <Button type="submit" className="mt-2 w-full">
            Enviar link de recuperação
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
