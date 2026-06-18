'use server';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/server/supabase';

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  // Em erro, volta para a tela de origem. Só aceitamos páginas de login de marca (/c/<slug>)
  // para evitar open-redirect; qualquer outra coisa cai no /login padrão.
  const returnTo = String(formData.get('returnTo') ?? '');
  const back = /^\/c\/[a-z0-9-]+$/.test(returnTo) ? returnTo : '/login';

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Erro de credencial NÃO deve "throw" (em prod isso vira a tela genérica de server error
  // com digest). Volta à tela de origem com uma mensagem amigável via querystring.
  if (error) redirect(`${back}?erro=credenciais`);

  // O destino real (/app ou /admin) é decidido em /app conforme o vínculo do usuário.
  redirect('/app');
}
