// Минимальный service worker для PWA (Add to Home Screen).
// ВАЖНО: кэшируем ТОЛЬКО статику. Страницы, /api и авторизацию (OAuth) не трогаем —
// иначе кэш ломал вход (несовпадение state в Яндекс-входе).
const CACHE = "dpc-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // удалить старые кэши (в т.ч. где раньше лежали страницы/авторизация)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Кэшируем только статику. Всё остальное (страницы, /api, /auth, OAuth) —
  // отдаём браузеру как есть, service worker не вмешивается.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(png|jpe?g|svg|webp|gif|ico|woff2?|ttf|css|js)$/.test(url.pathname);
  if (!isStatic) return;

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
