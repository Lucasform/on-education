import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

type CookieItem = { name: string; value: string; options: CookieOptions };

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
  const failure = NextResponse.redirect(new URL('/login', origin));

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

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  return error ? failure : success;
}
