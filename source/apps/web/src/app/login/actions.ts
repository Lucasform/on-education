'use server';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/server/supabase';

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Erro de credencial NÃO deve "throw" (em prod isso vira a tela genérica de server error
  // com digest). Volta ao login com uma mensagem amigável via querystring.
  if (error) redirect('/login?erro=credenciais');

  // O destino real (/app ou /admin) é decidido em /app conforme o vínculo do usuário.
  redirect('/app');
}
