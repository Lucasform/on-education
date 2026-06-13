import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieItem = { name: string; value: string; options: CookieOptions };

/**
 * Mantém a sessão do Supabase fresca (refresh do token) gravando os cookies na resposta.
 * Também verifica AAL para perfis administrativos: se MFA estiver ativo no tenant e o
 * usuário só tiver AAL1, redireciona para o desafio MFA antes de acessar /app.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  if (!hasSession) return response;

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

  try {
    await supabase.auth.getUser();

    // Verifica MFA apenas em rotas /app (exclui challenge e conta/mfa para evitar loop).
    const path = request.nextUrl.pathname;
    const isAppRoute = path.startsWith('/app');
    const isMfaRoute = path.startsWith('/mfa-challenge') || path.startsWith('/app/conta/mfa');
    if (isAppRoute && !isMfaRoute) {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      // Se há fator verificado mas a sessão não está no AAL2, exige o desafio.
      if (
        aalData?.nextLevel === 'aal2' &&
        aalData?.currentLevel !== 'aal2'
      ) {
        const redirectUrl = new URL('/mfa-challenge', request.url);
        redirectUrl.searchParams.set('next', path);
        return NextResponse.redirect(redirectUrl);
      }
    }
  } catch {
    // Falha transitória (Supabase reiniciando): nunca derruba as rotas.
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
