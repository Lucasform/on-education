import { SubmitButton } from '@/components/submit-button';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { getAuthContext } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alterar senha · Edu On Way' };

async function changePasswordAction(formData: FormData): Promise<void> {
  'use server';
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const newPassword = String(formData.get('newPassword') ?? '').trim();
  const confirm = String(formData.get('confirm') ?? '').trim();

  if (!newPassword || newPassword.length < 6 || newPassword !== confirm) {
    redirect('/app/alterar-senha?error=1');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { must_change_password: false },
  });

  if (error) redirect('/app/alterar-senha?error=2');
  redirect('/app');
}

export default async function AlterarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const { error } = await searchParams;
  const errorMsg = error === '1'
    ? 'A senha deve ter pelo menos 6 caracteres e as duas entradas devem ser iguais.'
    : error === '2'
      ? 'Erro ao alterar senha. Tente novamente.'
      : null;

  return (
    <>
      <PageHeader
        title="Alterar senha"
        description="Defina uma nova senha para sua conta."
        back={{ href: '/app', label: 'Voltar ao início' }}
      />
      <div className={`${cardClass} max-w-md`}>
        {errorMsg && (
          <div className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMsg}
          </div>
        )}
        <form action={changePasswordAction} className="flex flex-col gap-3">
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
            <label className="mb-1 block text-xs text-muted-foreground">Confirmar nova senha</label>
            <input
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="repita a senha"
              className={fieldClass}
            />
          </div>
          <SubmitButton type="submit">Alterar senha</SubmitButton>
        </form>
      </div>
    </>
  );
}
