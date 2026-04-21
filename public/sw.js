const CACHE_NAME = 'vocalai-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first or stale-while-revalidate could go here
  // For basic PWA, we just need the fetch handler to exist
});
