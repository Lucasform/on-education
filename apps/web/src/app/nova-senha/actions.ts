'use server';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/server/supabase';

/**
 * Define uma nova senha para o usuário da sessão atual. Usado após o link de recuperação
 * (que abre a sessão via /auth/confirm com type=recovery). Sem sessão, volta ao login.
 */
export async function setPasswordAction(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) redirect('/nova-senha?erro=curta');
  if (password !== confirm) redirect('/nova-senha?erro=diferente');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/nova-senha?erro=falha');

  // O destino real (/app ou /admin) é decidido em /app conforme o vínculo do usuário.
  redirect('/app');
}
