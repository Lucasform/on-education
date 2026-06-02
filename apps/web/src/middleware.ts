import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieItem = { name: string; value: string; options: CookieOptions };

/**
 * Mantém a sessão do Supabase fresca (refresh do token) gravando os cookies na resposta.
 * Sem isso, RSCs (read-only de cookie) não conseguiriam renovar a sessão.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items: CookieItem[]) => {
        items.forEach(({ name, value, options }) =>
          response.cookies.set({ name, value, ...options }),
        );
      },
    },
  });
  // Um soluço do Supabase (ex.: instance reiniciando no Free) NUNCA pode derrubar as rotas.
  try {
    await supabase.auth.getUser();
  } catch {
    // segue sem refresh; a próxima requisição tenta de novo.
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
