import 'server-only';

import { requireEnv } from '@on-education/config';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type CookieItem = { name: string; value: string; options: CookieOptions };

/**
 * Client do Supabase Auth ligado aos cookies da requisição (RSC / server actions).
 * Usa a anon/publishable key; a sessão do usuário fica nos cookies (httpOnly).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: CookieItem[]) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }));
        } catch {
          // chamado de um RSC (read-only): o refresh de cookie é feito pelo middleware.
        }
      },
    },
  });
}

/**
 * Client ADMIN (service_role) — server-only, bypassa tudo. Usado p/ criar usuário no signup
 * (com email já confirmado, evitando depender de SMTP). NUNCA expor ao client.
 */
export function createSupabaseAdmin(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
