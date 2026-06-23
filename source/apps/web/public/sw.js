/* global self, clients */
// Service worker do PWA: instalável + notificações push. SEM cache agressivo (passthrough
// na rede), para nunca servir uma versão velha do app (deploys frequentes na Vercel).
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Passthrough: a presença do handler é o que satisfaz a instalabilidade.
});

// Notificação push recebida: mostra a notificação do sistema.
self.addEventListener('push', (event) => {
  let data = { title: 'Edu On Way', body: '', url: '/app' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Edu On Way', {
      body: data.body || '',
      icon: '/brand/app-icon-192.png',
      badge: '/brand/app-icon-192.png',
      data: { url: data.url || '/app' },
    }),
  );
});

// Clique na notificação: foca uma aba aberta do app ou abre a URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
