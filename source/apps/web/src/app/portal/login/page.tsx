import { SubmitButton } from '@/components/submit-button';
import { fieldClass } from '@/components/form';

import { loginGuardianAction } from './actions';

export const metadata = { title: 'Acesso ao portal · Edu On Way' };

const ERRORS: Record<string, string> = {
  campos: 'Preencha e-mail e senha.',
  invalido: 'E-mail ou senha incorretos.',
};

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMsg = error ? (ERRORS[error] ?? 'Erro inesperado. Tente novamente.') : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Portal do Responsável</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre com o e-mail e a senha fornecidos pela escola.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
            {errorMsg}
          </div>
        )}

        <form action={loginGuardianAction} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">E-mail</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Senha</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={fieldClass}
            />
          </div>
          <SubmitButton type="submit" className="w-full">
            Entrar
          </SubmitButton>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Se não possui senha, solicite o link de acesso à escola.
        </p>
      </div>
    </div>
  );
}
