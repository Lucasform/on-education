'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/server/supabase';

/**
 * Login/cadastro SEM senha (link mágico). Envia um e-mail com link de acesso. No `signup`,
 * guarda nome/espaço nos metadados; o provisionamento do tenant acontece no 1º acesso
 * (em /auth/confirm). Depende do envio de e-mail do Supabase estar ativo.
 */
export async function magicLinkAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const mode = String(formData.get('mode') ?? 'login');
  const ownerName = String(formData.get('ownerName') ?? '').trim();
  const workspaceName = String(formData.get('workspaceName') ?? '').trim();
  const back = mode === 'signup' ? '/signup' : '/login';
  if (!email) redirect(`${back}?magic=erro`);

  const origin = (await headers()).get('origin') ?? 'https://eduonway.com';
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: mode === 'signup',
      emailRedirectTo: `${origin}/auth/confirm?next=/app`,
      data:
        mode === 'signup'
          ? { full_name: ownerName || undefined, workspace_name: workspaceName || undefined }
          : undefined,
    },
  });
  if (error) redirect(`${back}?magic=erro`);
  redirect(`${back}?magic=enviado`);
}

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
