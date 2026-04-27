const CACHE_NAME = "tagarati-v5-offline";

// الروابط التي سيتم حفظها للعمل بدون إنترنت
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./localforage.min.js",
  "./html2canvas.min.js",
  "./jspdf.umd.min.js",
  "https://fonts.gstatic.com/s/tajawal/v12/Iura6YBj_oCad4k1nzSBC45I.woff2" // حفظ الخط أيضاً
];

// 1. مرحلة التثبيت: حفظ الملفات في ذاكرة الهاتف
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url))
      ).then(() => console.log("✅ تم حفظ جميع الملفات في الكاش"));
    })
  );
});

// 2. مرحلة التفعيل: تنظيف الكاش القديم
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

// 3. مرحلة جلب البيانات: الكاش أولاً (هذا ما يحل مشكلة الديناصور)
self.addEventListener("fetch", (event) => {
  // لا نقوم بتخزين طلبات POST أو الروابط الخارجية غير المعرفة
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // إذا وجد الملف في الكاش، نعرضه فوراً
      if (cachedResponse) {
        return cachedResponse;
      }
      // إذا لم يوجد، نطلبه من الشبكة ونحفظ نسخة منه للمرة القادمة
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // إذا فشل النت ولا يوجد كاش، نفتح الصفحة الرئيسية
        if (event.request.mode === 'navigate') {
          return caches.match("./index.html");
        }
      });
    })
  );
});
