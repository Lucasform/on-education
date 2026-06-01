import 'server-only';

import type { AuthContext } from '@on-education/auth';
import { getDbClient } from '@on-education/db';
import { resolveContextForUser } from '@on-education/module-nucleo';

import { createSupabaseServerClient } from './supabase';

/**
 * Contexto de autenticação a partir da sessão do Supabase Auth (Master Spec §6, §7.4).
 * O `tenantId` NUNCA vem do client: derivamos do usuário autenticado → membership no banco.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return resolveContextForUser(getDbClient(), user.id);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
