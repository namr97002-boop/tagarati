const CACHE_NAME = "tagarati-v4-offline";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json"
  // فقط الملفات الموجودة فعلاً
];

self.addEventListener("install", (event) => {
  console.log("[SW] تثبيت الإصدار", CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).catch(err => console.error("[SW] خطأ في التخزين:", err))
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] تفعيل الإصدار", CACHE_NAME);
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            console.log("[SW] حذف الكاش القديم:", name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // فقط نتعامل مع ملفات موقعنا
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200 && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    }).catch(() => {
      // في حال فشل كل شيء، نعيد صفحة index.html
      return caches.match("./index.html");
    })
  );
});