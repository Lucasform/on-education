import 'server-only';

import type { AuthContext } from '@on-education/auth';
import { getDbClient } from '@on-education/db';
import { resolveContextForTenant, resolveContextForUser } from '@on-education/module-nucleo';
import { cookies } from 'next/headers';

import { createSupabaseServerClient } from './supabase';

/** Cookie de view-as do super-admin (TEMPORÁRIO: admin aberto, sem auth ainda). */
export const IMPERSONATION_COOKIE = 'oe_admin_tenant';

/**
 * Contexto de autenticação (Master Spec §6, §7.4). Ordem:
 * 1) Se o super-admin está "entrando como" um tenant (cookie de impersonação), usa esse.
 * 2) Senão, deriva da sessão do Supabase Auth → membership do usuário.
 * O `tenantId` nunca vem como parâmetro do client; vem da sessão/cookie httpOnly.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const impersonated = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (impersonated) {
    return resolveContextForTenant(getDbClient(), impersonated);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return resolveContextForUser(getDbClient(), user.id);
}

/** Indica se a sessão atual é uma impersonação de admin (para o banner do /app). */
export async function isImpersonating(): Promise<boolean> {
  return Boolean((await cookies()).get(IMPERSONATION_COOKIE)?.value);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
