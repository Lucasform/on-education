'use server';

import {
  isSlugAvailable,
  normalizeSlug,
  provisionIndividualTenant,
  slugFormatError,
} from '@on-education/module-nucleo';
import { individualSignupSchema } from '@on-education/validation';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { createSupabaseAdmin, createSupabaseServerClient } from '@/server/supabase';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Signup do professor autônomo (Fase 1B.1) com Supabase Auth (e-mail+senha).
 * Cria o usuário JÁ confirmado (via service_role, sem depender de SMTP), provisiona o tenant
 * `individual` para esse usuário e abre a sessão.
 */
export async function signupAction(formData: FormData): Promise<void> {
  const rawSlug = String(formData.get('slug') ?? '').trim();
  const slug = rawSlug ? normalizeSlug(rawSlug) : undefined;
  const input = individualSignupSchema.parse({
    ownerEmail: formData.get('ownerEmail'),
    ownerName: formData.get('ownerName'),
    workspaceName: (formData.get('workspaceName') as string) || undefined,
    slug,
    planId: (formData.get('plano') as string) || undefined,
  });
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) redirect('/signup?erro=senha');
  // Valida o link público (se informado) ANTES de criar o usuário, pra não criar+apagar.
  if (slug) {
    if (slugFormatError(slug)) redirect('/signup?erro=link');
    if (!(await isSlugAvailable(db(), slug, NIL_UUID))) redirect('/signup?erro=linkuso');
  }

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
    await provisionIndividualTenant(db(), data.user.id, input, input.planId);
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
