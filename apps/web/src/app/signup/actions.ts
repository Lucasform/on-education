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
  if (password.length < 8) redirect('/signup?erro=senha');

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.ownerName },
  });
  // Nunca derrubar a página com 500: erro vira mensagem amigável no formulário.
  if (error || !data.user) {
    const existe = /registered|already|exists/i.test(error?.message ?? '');
    redirect(`/signup?erro=${existe ? 'existe' : 'config'}`);
  }

  try {
    await provisionIndividualTenant(db(), data.user.id, input);
  } catch {
    // O usuário JÁ foi criado no Auth acima. Se o provision falha (ex.: erro transitório do
    // pooler), ele ficaria órfão (existe no Auth, sem tenant) — sem conseguir logar nem recriar
    // ("e-mail já existe"). Desfaz a criação para que o cadastro possa ser refeito do zero.
    try {
      await admin.auth.admin.deleteUser(data.user.id);
    } catch {
      // melhor esforço: se a limpeza falhar, ainda redirecionamos com erro amigável.
    }
    redirect('/signup?erro=falha');
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.ownerEmail,
    password,
  });
  if (signInError) redirect('/login');

  redirect('/app');
}
