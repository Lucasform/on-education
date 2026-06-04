import type { MetadataRoute } from 'next';

/**
 * Manifesto PWA (item 16, primeiro passo de app instalável). Com o service worker
 * (`public/sw.js`) registrado, o app fica "instalável" no celular/desktop. Abre direto
 * no workspace (`/app`) em modo standalone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Edu On Way',
    short_name: 'Edu On Way',
    description: 'Ensine com inteligência, do plano de aula ao boletim, com o agente WayOn.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#130f1f',
    theme_color: '#130f1f',
    lang: 'pt-BR',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
