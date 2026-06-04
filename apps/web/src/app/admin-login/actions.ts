'use server';

import { loadEnv } from '@on-education/config';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/server/supabase';

function isAllowed(email: string): boolean {
  const allow = (loadEnv().SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.length > 0 && allow.includes(email.trim().toLowerCase());
}

/**
 * Login EXCLUSIVO do super-admin. Autentica no Supabase e só deixa passar e-mails da
 * allowlist `SUPER_ADMIN_EMAILS`; qualquer outro é deslogado na hora. Não cria conta.
 */
export async function adminLoginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!isAllowed(email)) redirect('/admin-login?erro=naoadmin');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/admin-login?erro=credenciais');

  redirect('/admin');
}
