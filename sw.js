const CACHE = 'mimory-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res && res.status === 200 && e.request.method === 'GET') {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return res;
  }).catch(() => caches.match('./index.html'))));
});

// Background check reminders every minute
self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-reminders') e.waitUntil(checkReminders());
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Mimory', body: 'Напоминание' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: './icon-192.png', badge: './icon-192.png',
    vibrate: [300, 100, 300], actions: [
      { action: 'done', title: '✅ Выполнено' },
      { action: 'snooze', title: '⏰ Позже' }
    ]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'done' || e.action === 'snooze') {
    e.waitUntil(self.clients.matchAll().then(clients => {
      if (clients.length > 0) clients[0].postMessage({ action: e.action, taskId: e.notification.data?.taskId });
      else self.clients.openWindow('./');
    }));
  } else {
    e.waitUntil(self.clients.openWindow('./'));
  }
});

async function checkReminders() {
  const clients = await self.clients.matchAll();
  if (clients.length > 0) return;
}
