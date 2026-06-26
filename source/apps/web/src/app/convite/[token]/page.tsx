import { acceptInvitation, getInvitationByToken } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthSubmit } from '@/components/auth-submit';
import { AuthField, authInput, BrandAuthScreen } from '@/components/brand-auth-screen';
import { ConsentNote } from '@/components/consent-note';
import { db } from '@/server/db';
import { createSupabaseAdmin, createSupabaseServerClient } from '@/server/supabase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aceitar convite · Edu On Way' };

const ROLE_LABEL: Record<string, string> = {
  owner: 'Dono',
  director: 'Diretor(a)',
  coordinator: 'Coordenador(a)',
  secretary: 'Secretário(a)',
  teacher: 'Professor(a)',
  monitor: 'Monitor(a)',
};

const ERROS: Record<string, string> = {
  senha: 'A senha precisa ter ao menos 8 caracteres.',
  existe: 'Este e-mail já tem conta. Faça login e o convite será aplicado ao entrar.',
  config: 'Não foi possível criar o acesso agora. Tente novamente em instantes.',
  falha: 'Não foi possível aceitar o convite. Ele pode já ter sido usado.',
  invalido: 'Convite inválido ou já utilizado.',
};

/** Aceita o convite: cria a conta (e-mail do convite + senha), vincula à escola e abre a sessão. */
async function acceptInviteAction(formData: FormData): Promise<void> {
  'use server';
  const token = String(formData.get('token') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) redirect(`/convite/${token}?erro=senha`);

  const invite = await getInvitationByToken(db(), token);
  if (!invite || invite.status !== 'pending') redirect(`/convite/${token}?erro=invalido`);

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: invite!.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name || undefined },
  });
  if (error || !data.user) {
    const existe = /registered|already|exists/i.test(error?.message ?? '');
    redirect(`/convite/${token}?erro=${existe ? 'existe' : 'config'}`);
  }

  try {
    await acceptInvitation(db(), token, data.user.id);
  } catch {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    redirect(`/convite/${token}?erro=falha`);
  }

  const supabase = await createSupabaseServerClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: invite!.email,
    password,
  });
  if (signErr) redirect('/login');
  redirect('/app');
}

export default async function ConvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;
  const invite = await getInvitationByToken(db(), token).catch(() => null);

  if (!invite || invite.status !== 'pending') {
    return (
      <BrandAuthScreen
        title="Convite indisponível"
        subtitle="Este convite é inválido ou já foi utilizado."
        footer={
          <span>
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
              Entrar
            </Link>
          </span>
        }
      >
        <p className="text-center text-sm text-white/70">
          Peça à escola para enviar um novo convite.
        </p>
      </BrandAuthScreen>
    );
  }

  const papel = ROLE_LABEL[invite.role] ?? invite.role;

  return (
    <BrandAuthScreen
      title="Você foi convidado"
      subtitle={`Crie sua senha para entrar como ${papel}${invite.tenantName ? ` na ${invite.tenantName}` : ''}.`}
      footer={
        <span>
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
            Entrar
          </Link>
        </span>
      }
    >
      {erro && (
        <p className="mb-3 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2 text-center text-sm text-red-50">
          {ERROS[erro] ?? ERROS.falha}
        </p>
      )}

      <form action={acceptInviteAction} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <AuthField label="Seu nome">
          <input name="name" required minLength={2} placeholder="Como você assina" className={authInput} />
        </AuthField>
        <AuthField label="E-mail">
          <input value={invite.email} readOnly disabled className={`${authInput} opacity-70`} />
        </AuthField>
        <AuthField label="Senha" hint="(mín. 8 caracteres)">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Crie uma senha"
            className={authInput}
          />
        </AuthField>
        <AuthSubmit pendingLabel="Entrando…">Criar acesso e entrar</AuthSubmit>
        <ConsentNote />
      </form>
    </BrandAuthScreen>
  );
}
