/* Service worker гостевого меню: только Web Push. Ничего не кэширует и fetch не перехватывает —
   страница и app.js всегда берутся с сервера (старые версии не залипают). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = String(data.title || 'Фуджи').slice(0, 80);
  const options = {
    body: String(data.body || '').slice(0, 200),
    icon: '/icon.svg',
    badge: '/icon.svg',
    lang: 'ru',
    tag: data.tag ? String(data.tag) : undefined,
    renotify: Boolean(data.tag),
    data: { url: '/', sessionId: data.sessionId || null },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = list.find((c) => new URL(c.url).origin === self.location.origin);
    if (open) {
      try { await open.focus(); return; } catch { /* откроем новую вкладку */ }
    }
    await self.clients.openWindow(target);
  })());
});
