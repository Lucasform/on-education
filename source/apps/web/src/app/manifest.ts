import type { MetadataRoute } from 'next';

import { resolveTenantBrand } from '@/server/tenant-brand';

/**
 * Manifesto PWA DINÂMICO por tenant. Logado numa escola com logo, a instalação usa o nome
 * e o logo dela (white-label); senão, a identidade padrão do produto ("Edu On Way" + ON).
 *
 * Os ícones apontam para rotas tenant-aware (/brand/*) que resolvem a sessão a cada
 * requisição — por isso o manifesto também precisa ser dinâmico.
 *
 * Limite conhecido: como todas as escolas dividem o mesmo domínio, o sistema operacional
 * identifica UM app por origem. Funciona para "uma escola instala nos aparelhos dela";
 * para vários ícones de escolas no MESMO aparelho, o caminho é subdomínio por escola.
 */
export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { name } = await resolveTenantBrand();
  const shortName = name.length <= 12 ? name : name.slice(0, 12).trim();
  return {
    // `id` fixo: o SO trata como UM app por origem (não cria entradas duplicadas a cada update).
    id: '/app',
    name,
    short_name: shortName,
    description: 'Ensine com inteligência, do plano de aula ao boletim, com o agente WayOn.',
    start_url: '/app',
    display: 'standalone',
    // Abrir o app FOCA a janela já aberta em vez de abrir outra (Chromium/Edge/Android).
    launch_handler: { client_mode: 'focus-existing' },
    background_color: '#13152E',
    theme_color: '#13152E',
    lang: 'pt-BR',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
