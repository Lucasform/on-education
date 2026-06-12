import 'server-only';

import { cache } from 'react';

import type { AuthContext } from '@on-education/auth';
import { loadEnv } from '@on-education/config';
import { getDbClient } from '@on-education/db';
import {
  adminTenantContext,
  resolveContextForTenant,
  resolveContextForUser,
} from '@on-education/module-nucleo';
import { cookies } from 'next/headers';

import { createSupabaseServerClient } from './supabase';

/** Cookie de view-as do super-admin. */
export const IMPERSONATION_COOKIE = 'oe_admin_tenant';

/**
 * Contexto de autenticação (Master Spec §6, §7.4). Ordem:
 * 1) Se o super-admin está "entrando como" um tenant (cookie de impersonação), usa esse.
 * 2) Senão, deriva da sessão do Supabase Auth → membership do usuário.
 * O `tenantId` nunca vem como parâmetro do client; vem da sessão/cookie httpOnly.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  try {
    const cookieStore = await cookies();
    const impersonated = cookieStore.get(IMPERSONATION_COOKIE)?.value;
    if (impersonated) {
      // SEGURANÇA: a impersonação só vale se a sessão REAL for super-admin. Sem isso,
      // qualquer um poderia forjar o cookie e ver qualquer escola. (getSuperAdminEmail é
      // cacheado e não toca no banco.)
      const adminEmail = await getSuperAdminEmail();
      if (adminEmail) {
        // Cookie `tenantId|tenantType`: monta o contexto SEM tocar no banco.
        const [tenantId, tenantType] = impersonated.split('|');
        if (tenantId && (tenantType === 'organization' || tenantType === 'individual')) {
          return adminTenantContext(tenantId, tenantType);
        }
        // Cookie antigo (só o id): resolve pelo banco como fallback.
        return await resolveContextForTenant(getDbClient(), tenantId || impersonated);
      }
      // Cookie presente mas a sessão não é admin: ignora e segue como usuário normal.
    }

    // getSession lê o JWT local (sem ida à rede); o middleware mantém a sessão fresca.
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;
    return await resolveContextForUser(getDbClient(), userId);
  } catch {
    // Falha transitória (Supabase/DB): trata como "sem sessão" em vez de derrubar a página.
    return null;
  }
});

/** Indica se a sessão atual é uma impersonação de admin (para o banner do /app). */
export async function isImpersonating(): Promise<boolean> {
  return Boolean((await cookies()).get(IMPERSONATION_COOKIE)?.value);
}

function superAdminEmails(): string[] {
  return (loadEnv().SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * E-mail do super-admin logado, validado contra a allowlist `SUPER_ADMIN_EMAILS`.
 * Usa a sessão REAL do Supabase (ignora o cookie de impersonação de propósito) e
 * retorna `null` para qualquer um fora da lista — allowlist vazia tranca o /admin.
 */
export const getSuperAdminEmail = cache(async (): Promise<string | null> => {
  try {
    const allow = superAdminEmails();
    if (allow.length === 0) return null;
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const email = session?.user?.email?.toLowerCase();
    if (!email) return null;
    return allow.includes(email) ? email : null;
  } catch {
    return null;
  }
});

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
