// Service Worker do push (Prisma). Registrado na central de notificações.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch {}
  const titulo = d.titulo || 'Prisma';
  const corpo = d.corpo || '';
  const url = d.url || '/';
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.openWindow(url));
});
