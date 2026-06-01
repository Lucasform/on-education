'use server';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/server/supabase';

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('E-mail ou senha inválidos.');

  redirect('/app');
}
