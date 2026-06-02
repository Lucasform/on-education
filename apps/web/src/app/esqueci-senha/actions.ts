'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/server/supabase';

/**
 * Dispara o e-mail de recuperação de senha (Supabase). Depende do SMTP do projeto estar
 * configurado para a entrega. O link do e-mail leva à rota /auth/confirm (type=recovery),
 * que abre a sessão e segue para /nova-senha. Não revela se o e-mail existe.
 */
export async function requestResetAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) redirect('/esqueci-senha?status=enviado');

  const origin = (await headers()).get('origin') ?? 'https://on-education-seven.vercel.app';
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/nova-senha`,
  });

  redirect('/esqueci-senha?status=enviado');
}
