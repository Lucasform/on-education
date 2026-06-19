import { getDbClient } from '@on-education/db';
import {
  isSlugAvailable,
  normalizeSlug,
  provisionIndividualTenant,
  resolveContextForUser,
  slugFormatError,
  syncUserFromAuth,
} from '@on-education/module-nucleo';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { EmailOtpType, User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

type CookieItem = { name: string; value: string; options: CookieOptions };

/**
 * Garante que o usuário do link mágico tenha um tenant. Cadastro sem senha cria só o usuário
 * no Auth; o tenant (workspace individual) é provisionado aqui, no 1º acesso, com os metadados
 * informados no cadastro. Quem já tem tenant (login normal, reset de senha) passa direto.
 */
async function ensureTenant(user: User): Promise<void> {
  const client = getDbClient();
  const fullName = (user.user_metadata?.full_name as string) || user.email || 'Professor(a)';
  if (user.email) await syncUserFromAuth(client, user.id, user.email, fullName).catch(() => {});
  const existing = await resolveContextForUser(client, user.id).catch(() => null);
  if (existing) return;
  const workspace = (user.user_metadata?.workspace_name as string)?.trim() || fullName;
  // Link público escolhido no cadastro: só aplica se for válido E estiver livre,
  // pra não bloquear o provisionamento por causa de um slug ocupado/inválido.
  const rawSlug = (user.user_metadata?.slug as string)?.trim();
  let slug: string | undefined;
  if (rawSlug) {
    const norm = normalizeSlug(rawSlug);
    const free = await isSlugAvailable(client, norm, '00000000-0000-0000-0000-000000000000').catch(
      () => false,
    );
    if (!slugFormatError(norm) && free) slug = norm;
  }
  await provisionIndividualTenant(client, user.id, {
    ownerEmail: user.email ?? `${user.id}@magic.local`,
    ownerName: fullName,
    workspaceName: workspace,
    slug,
  }).catch(() => {});
}

/**
 * Confirma um link mágico (token_hash) e abre a sessão, gravando os cookies na resposta de
 * redirect. Não depende de SMTP: o link é gerado pelo Supabase Admin e entregue direto.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/app';

  const success = NextResponse.redirect(new URL(next, origin));
  const failure = NextResponse.redirect(new URL('/login?magic=expirado', origin));

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!tokenHash || !type || !url || !anon) return failure;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items: CookieItem[]) =>
        items.forEach(({ name, value, options }) =>
          success.cookies.set({ name, value, ...options }),
        ),
    },
  });

  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) return failure;
  // Cadastro sem senha (link mágico): provisiona o tenant no 1º acesso. Reset de senha
  // (next=/nova-senha) e logins de quem já tem tenant passam direto.
  if (next !== '/nova-senha') await ensureTenant(data.user).catch(() => {});
  return success;
}
