'use server';

import { provisionOrganizationTenant } from '@on-education/module-nucleo';
import { organizationSignupSchema } from '@on-education/validation';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { createSupabaseAdmin, createSupabaseServerClient } from '@/server/supabase';

/**
 * Signup da escola (Fase 1A.1) com Supabase Auth (e-mail+senha). Cria o usuário já
 * confirmado (service_role), provisiona o tenant `organization` (owner+director, unidade Sede)
 * e abre a sessão.
 */
export async function signupSchoolAction(formData: FormData): Promise<void> {
  const input = organizationSignupSchema.parse({
    ownerEmail: formData.get('ownerEmail'),
    ownerName: formData.get('ownerName'),
    schoolName: formData.get('schoolName'),
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

  await provisionOrganizationTenant(db(), data.user.id, input);

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.ownerEmail,
    password,
  });
  if (signInError) throw new Error(`Conta criada, mas falha ao entrar: ${signInError.message}`);

  redirect('/app');
}
