// sw.js - Service Worker يعمل بشكل مؤكد بدون إنترنت
const CACHE_NAME = 'تجارتي-v3';

// ✅ الملفات الأساسية التي يجب تخزينها (ضع كل ملفاتك هنا)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ✅ تثبيت Service Worker وتخزين الملفات فوراً
self.addEventListener('install', event => {
  console.log('[SW] جاري التثبيت...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('[SW] تخزين الملفات الأساسية');
        // تخزين كل ملف على حدة مع التعامل مع الأخطاء
        for (const url of urlsToCache) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`[SW] تم تخزين: ${url}`);
            } else {
              console.warn(`[SW] فشل تخزين: ${url}`);
            }
          } catch (err) {
            console.warn(`[SW] خطأ في تخزين ${url}:`, err);
          }
        }
        return cache;
      })
  );
  self.skipWaiting(); // تفعيل الـ SW فوراً
});

// ✅ جلب الملفات (من الكاش أولاً، ثم من الشبكة)
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // تجاهل طلبات Firebase و Google Analytics (إذا وجدت)
  if (url.includes('firebase') || url.includes('google-analytics')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // ✅ وجدنا الملف في الكاش
          console.log(`[SW] من الكاش: ${url}`);
          return response;
        }
        
        // ❌ الملف غير موجود في الكاش، نجلبه من الشبكة
        console.log(`[SW] من الشبكة: ${url}`);
        return fetch(event.request).then(networkResponse => {
          // نخزن الملف الجديد للاستخدام القادم
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
      .catch(() => {
        // في حال عدم وجود اتصال ولا كاش، نعرض رسالة
        if (url.includes('/')) {
          return new Response(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head><meta charset="UTF-8"><title>غير متصل</title>
            <style>body{font-family:Tajawal;text-align:center;padding:50px;background:#0a0a12;color:#ffd700;}</style>
            </head>
            <body>
              <h1>⚠️ لا يوجد اتصال بالإنترنت</h1>
              <p>الرجاء الاتصال بالإنترنت ثم تحديث الصفحة</p>
              <button onclick="location.reload()" style="padding:12px 30px;background:#ffd700;color:#000;border:none;border-radius:30px;">تحديث</button>
            </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
        }
        return new Response('غير متصل بالإنترنت', { status: 503 });
      })
  );
});

// ✅ تنظيف الكاش القديم عند تحديث الـ SW
self.addEventListener('activate', event => {
  console.log('[SW] جاري التفعيل وتنظيف الكاش القديم');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] حذف الكاش القديم: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // التحكم بالصفحات المفتوحة فوراً
});