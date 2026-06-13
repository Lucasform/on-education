import { createBrowserClient } from '@supabase/ssr';

/**
 * Client do Supabase para uso em componentes de client (browser).
 * Usado exclusivamente para operações que precisam do browser: MFA (enroll/challenge/verify).
 * Não usar em Server Components ou Server Actions — usar o `createSupabaseServerClient`.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
