// service-worker.js
const CACHE_NAME = "daily-task-app-v1";
const ASSETS_TO_CACHE = [
  "/dailytaskapp/",
  "/dailytaskapp/index.html",
  "/dailytaskapp/style.css",
  "/dailytaskapp/main.js",
  "/dailytaskapp/icon-192.png",
  "/dailytaskapp/icon-512.png",
  "/dailytaskapp/apple-touch-icon.png",
  "/dailytaskapp/manifest.json"
];

// Install service worker and cache assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate service worker and remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch assets from cache, then network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
