import { requireEnv } from '@on-education/config';
import { syncUserFromAuth } from '@on-education/module-nucleo';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { createSupabaseAdmin, createSupabaseServerClient } from '@/server/supabase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acesso & segurança · Edu On Way' };

const linkBtn =
  'inline-block rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Atualiza o nome da conta (metadata do Auth + tabela users). Reflete no app e nos documentos. */
async function updateNameAction(formData: FormData): Promise<void> {
  'use server';
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) redirect('/app/conta/seguranca?erro=nome');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.updateUser({ data: { full_name: name } });
  if (user?.email) await syncUserFromAuth(db(), ctx.userId, user.email, name);

  revalidatePath('/app/conta/seguranca');
  redirect('/app/conta/seguranca?ok=nome');
}

/** Troca o e-mail de login. Exige a senha atual (reautenticação) e aplica direto via admin. */
async function updateEmailAction(formData: FormData): Promise<void> {
  'use server';
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const newEmail = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!EMAIL_RE.test(newEmail)) redirect('/app/conta/seguranca?erro=emailinvalido');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = user?.email;
  const fullName = (user?.user_metadata?.full_name as string) ?? null;
  if (!currentEmail) redirect('/login');
  if (newEmail === currentEmail.toLowerCase()) redirect('/app/conta/seguranca?erro=mesmoemail');

  // Reautenticação: confere a senha atual num client isolado (não toca a sessão dos cookies).
  const reauth = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: pwErr } = await reauth.auth.signInWithPassword({ email: currentEmail, password });
  if (pwErr) redirect('/app/conta/seguranca?erro=senha');

  const admin = createSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(ctx.userId, {
    email: newEmail,
    email_confirm: true,
  });
  if (error) {
    const used = /registered|already|exists/i.test(error.message);
    redirect(`/app/conta/seguranca?erro=${used ? 'emailuso' : 'emailfalha'}`);
  }
  await syncUserFromAuth(db(), ctx.userId, newEmail, fullName);

  revalidatePath('/app/conta/seguranca');
  redirect('/app/conta/seguranca?ok=email');
}

const OK: Record<string, string> = {
  nome: 'Nome da conta atualizado.',
  email: 'E-mail de login atualizado. Use o novo e-mail no próximo acesso.',
};
const ERRO: Record<string, string> = {
  nome: 'Informe um nome com pelo menos 2 caracteres.',
  emailinvalido: 'E-mail inválido. Confira e tente de novo.',
  mesmoemail: 'Esse já é o seu e-mail de login.',
  senha: 'Senha atual incorreta. Não foi possível confirmar a troca.',
  emailuso: 'Esse e-mail já está em uso por outra conta.',
  emailfalha: 'Não foi possível trocar o e-mail agora. Tente novamente.',
};

export default async function SegurancaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const { ok, erro } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? '';
  const fullName = (user?.user_metadata?.full_name as string) ?? '';

  return (
    <div className="flex flex-col gap-5">
      {ok && OK[ok] && (
        <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          {OK[ok]}
        </div>
      )}
      {erro && ERRO[erro] && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {ERRO[erro]}
        </div>
      )}

      <form action={updateNameAction} className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Nome da conta</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          O nome que aparece para você no app e nos seus documentos.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="name"
            defaultValue={fullName}
            required
            minLength={2}
            maxLength={120}
            placeholder="Seu nome"
            className={`${fieldClass} sm:max-w-sm`}
          />
          <SubmitButton type="submit">Salvar nome</SubmitButton>
        </div>
      </form>

      <form action={updateEmailAction} className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">E-mail de login</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          É o e-mail que você usa para entrar. Por segurança, confirme com a sua senha atual.
        </p>
        <div className="grid gap-2 sm:max-w-sm">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Novo e-mail
            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              maxLength={120}
              placeholder="voce@email.com"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Senha atual
            <input
              name="password"
              type="password"
              required
              placeholder="Sua senha"
              className={fieldClass}
            />
          </label>
          <div className="mt-1">
            <SubmitButton type="submit">Alterar e-mail</SubmitButton>
          </div>
        </div>
      </form>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Senha</h2>
        <p className="mb-3 text-xs text-muted-foreground">Troque a sua senha de acesso.</p>
        <Link href="/app/alterar-senha" className={linkBtn}>
          Alterar senha
        </Link>
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Verificação em duas etapas (2FA)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Adicione uma camada extra de proteção com um app autenticador (Google Authenticator,
          Authy). Opcional, mas recomendado.
        </p>
        <Link href="/app/conta/mfa" className={linkBtn}>
          Configurar 2FA
        </Link>
      </div>
    </div>
  );
}
