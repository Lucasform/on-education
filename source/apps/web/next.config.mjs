/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
