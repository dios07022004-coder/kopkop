// Минимальный service worker — нужен для установки PWA (Add to Home Screen).
// Сеть в приоритете, при офлайне — из кэша. Трогает только свои GET-запросы.
const CACHE = "dpc-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // удалить старые кэши
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  // не вмешиваемся в сторонние запросы (Supabase, Яндекс.Метрика, OAuth)
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(async () => (await caches.match(request)) || Response.error()),
  );
});
