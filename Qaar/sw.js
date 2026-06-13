self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Pass-through fetch for a basic PWA install requirement
  e.respondWith(fetch(e.request).catch(() => new Response('Offline.')));
});