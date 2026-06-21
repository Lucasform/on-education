// Headers de segurança aplicados a TODA resposta. Escolhidos para endurecer sem quebrar o app:
// nenhum mexe em script/estilo (CSP completa fica para uma rodada testada à parte). O
// `frame-ancestors 'self'` reforça o anti-clickjacking junto do X-Frame-Options.
const securityHeaders = [
  // Força HTTPS por 2 anos (o domínio já é HTTPS na Vercel); inclui subdomínios.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Anti-clickjacking: ninguém embute o app em iframe de outro site.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  // Navegador não "adivinha" o tipo do arquivo (evita execução de conteúdo disfarçado).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Não vaza a URL completa (com tokens em query) para sites externos.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Desliga APIs sensíveis que o app não usa.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Não anunciar a stack (remove o header X-Powered-By).
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Expõe as variáveis do Supabase para componentes de client (MFA, auth client-side).
  // SUPABASE_ANON_KEY é a chave publicável — seguro expor no bundle do browser.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
  },
  // Pacotes do monorepo são consumidos como TypeScript (source) — Next transpila.
  transpilePackages: [
    '@on-education/ui',
    '@on-education/core',
    '@on-education/config',
    '@on-education/entitlements',
    '@on-education/auth',
    '@on-education/db',
    '@on-education/validation',
    '@on-education/module-nucleo',
    '@on-education/module-pedagogico',
    '@on-education/module-ia',
    '@on-education/module-sala-de-aula',
    '@on-education/module-comunicacao',
  ],
};

export default nextConfig;
