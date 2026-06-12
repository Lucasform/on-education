/* global self */
// Service worker mínimo para tornar o app instalável (PWA, item 16).
// Propositalmente SEM cache agressivo: faz passthrough na rede para nunca servir uma
// versão velha do app (deploys frequentes na Vercel). Evoluir para offline no futuro.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Passthrough: deixa o navegador buscar normalmente. A presença deste handler é o que
  // satisfaz o critério de instalabilidade dos navegadores.
});
