import { SubmitButton } from '@/components/submit-button';
import { fieldClass } from '@/components/form';
import { redirect } from 'next/navigation';

import { getGuardianSession } from '@/server/guardian-session';
import { changeGuardianPasswordAction } from '../login/actions';

export const metadata = { title: 'Alterar senha · Portal do Responsável' };

const ERRORS: Record<string, string> = {
  curta: 'A senha deve ter pelo menos 6 caracteres.',
  diferente: 'As senhas não coincidem.',
};

export default async function AlterarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getGuardianSession();
  if (!session) redirect('/portal/login');

  const { error } = await searchParams;
  const errorMsg = error ? (ERRORS[error] ?? 'Erro inesperado.') : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Crie sua senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta é sua primeira entrada. Defina uma senha pessoal para continuar.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
            {errorMsg}
          </div>
        )}

        <form action={changeGuardianPasswordAction} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nova senha</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="mínimo 6 caracteres"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Confirmar senha</label>
            <input
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="repita a senha"
              className={fieldClass}
            />
          </div>
          <SubmitButton type="submit" className="w-full">
            Salvar senha e continuar
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
