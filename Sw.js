const CACHE_NAME = "tagarati-v5-offline";

// الملفات الأساسية التي سيتم حفظها للعمل بدون إنترنت
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./localforage.min.js",
  "./html2canvas.min.js",
  "./jspdf.umd.min.js",

  // الخط المحلي (مهم جدًا يكون داخل المشروع)
  "./fonts/Tajawal-Regular.woff2",
  "./fonts/Tajawal-Bold.woff2"
];

// ===================== 1. التثبيت =====================
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(
        PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }))
      );
    }).then(() => {
      console.log("✅ تم حفظ جميع الملفات في الكاش");
    })
  );
});

// ===================== 2. التفعيل =====================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ===================== 3. الجلب (Offline First) =====================
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. إذا موجود في الكاش
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. إذا غير موجود نجيب من النت ونخزنه
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;

        const clone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });

        return response;
      }).catch(() => {
        // 3. إذا ما في نت نفتح الصفحة الرئيسية
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});