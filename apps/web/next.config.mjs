/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pacotes do monorepo são consumidos como TypeScript (source) — Next transpila.
  transpilePackages: [
    '@on-education/ui',
    '@on-education/core',
    '@on-education/config',
    '@on-education/entitlements',
  ],
};

export default nextConfig;
