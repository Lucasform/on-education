'use server';

import { provisionIndividualTenant } from '@on-education/module-nucleo';
import { individualSignupSchema } from '@on-education/validation';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { createSupabaseAdmin, createSupabaseServerClient } from '@/server/supabase';

/**
 * Signup do professor autônomo (Fase 1B.1) com Supabase Auth (e-mail+senha).
 * Cria o usuário JÁ confirmado (via service_role, sem depender de SMTP), provisiona o tenant
 * `individual` para esse usuário e abre a sessão.
 */
export async function signupAction(formData: FormData): Promise<void> {
  const input = individualSignupSchema.parse({
    ownerEmail: formData.get('ownerEmail'),
    ownerName: formData.get('ownerName'),
    workspaceName: (formData.get('workspaceName') as string) || undefined,
  });
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) throw new Error('A senha precisa ter ao menos 8 caracteres.');

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.ownerName },
  });
  if (error || !data.user) {
    throw new Error(`Não foi possível criar a conta: ${error?.message ?? 'erro desconhecido'}`);
  }

  await provisionIndividualTenant(db(), data.user.id, input);

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.ownerEmail,
    password,
  });
  if (signInError) throw new Error(`Conta criada, mas falha ao entrar: ${signInError.message}`);

  redirect('/app');
}
