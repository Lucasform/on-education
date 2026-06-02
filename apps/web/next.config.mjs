/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
