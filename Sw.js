const CACHE_NAME = "tagarati-v5-offline"; // تم التحديث للإصدار الخامس لمسح الكاش القديم وتفعيل النظام أوفلاين

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./localforage.min.js",   // تم إضافة المكتبة لتعمل بدون إنترنت
  "./html2canvas.min.js",   // تم إضافة المكتبة لتعمل بدون إنترنت
  "./jspdf.umd.min.js"      // تم إضافة المكتبة لتعمل بدون إنترنت
];

// مرحلة التثبيت: حفظ الملفات في ذاكرة الهاتف
self.addEventListener("install", (event) => {
  console.log("[SW] تثبيت الإصدار الجديد:", CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // استخدام allSettled لضمان استمرار التثبيت حتى لو فقد أحد الملفات
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url))
      );
    }).catch(err => console.error("[SW] خطأ في التخزين المسبق:", err))
  );
});

// مرحلة التفعيل: حذف الكاش القديم (v4 وما قبله)
self.addEventListener("activate", (event) => {
  console.log("[SW] تفعيل الإصدار:", CACHE_NAME);
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

// مرحلة جلب البيانات: البحث في الكاش أولاً قبل طلب الإنترنت
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // التعامل فقط مع ملفات موقعنا
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        // تحديث الكاش بالملفات الجديدة إذا كان هناك إنترنت
        if (response && response.status === 200 && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => cached);

      // العودة للملف المخزن إذا لم يتوفر اتصال
      return cached || networkFetch;
    }).catch(() => {
      // في حال فشل كل شيء، العودة للصفحة الرئيسية
      return caches.match("./index.html");
    })
  );
});
