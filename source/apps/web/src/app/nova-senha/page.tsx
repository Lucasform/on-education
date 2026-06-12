import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';
import { createSupabaseServerClient } from '@/server/supabase';

import { setPasswordAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nova senha · Edu On Way' };

const MENSAGENS: Record<string, string> = {
  curta: 'A senha precisa ter ao menos 8 caracteres.',
  diferente: 'As senhas não conferem.',
  falha: 'Não foi possível alterar a senha. Tente o link de recuperação de novo.',
};

export default async function NovaSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  // Só faz sentido com sessão aberta (vinda do link de recuperação).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { erro } = await searchParams;

  return (
    <AuthShell title="Definir nova senha" subtitle={`Conta: ${user.email}`}>
      {erro && MENSAGENS[erro] && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          {MENSAGENS[erro]}
        </p>
      )}
      <form action={setPasswordAction} className="flex flex-col gap-4">
        <Field label="Nova senha">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Ao menos 8 caracteres"
            className={fieldClass}
          />
        </Field>
        <Field label="Confirmar senha">
          <input name="confirm" type="password" required minLength={8} className={fieldClass} />
        </Field>
        <Button type="submit" className="mt-2 w-full">
          Salvar nova senha
        </Button>
      </form>
    </AuthShell>
  );
}
