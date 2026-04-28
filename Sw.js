// ==================== SW احترافي v3 ====================
const CACHE_NAME = 'sulaiman-system-v3';

// الملفات الأساسية (محلية فقط)
const STATIC_FILES = [
    '/index.html',
    '/manifest.json'
];

// ==================== INSTALL ====================
self.addEventListener('install', (event) => {
    console.log('🚀 SW: تثبيت...');

    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const file of STATIC_FILES) {
                try {
                    await cache.add(file);
                    console.log('✅ تم تخزين:', file);
                } catch (err) {
                    console.warn('❌ فشل تخزين:', file);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', (event) => {
    console.log('⚡ SW: تفعيل...');

    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('🗑️ حذف كاش قديم:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ==================== FETCH ====================
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // ====================
    // 1. الصفحات (HTML)
    // Cache First
    // ====================
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            caches.match(request).then((cached) => {
                return cached || fetch(request)
                    .then((response) => {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, response.clone());
                            return response;
                        });
                    })
                    .catch(() => {
                        return caches.match('/index.html');
                    });
            })
        );
        return;
    }

    // ====================
    // 2. باقي الملفات (JS, CSS, صور, خطوط)
    // Stale While Revalidate
    // ====================
    event.respondWith(
        caches.match(request).then((cached) => {

            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                })
                .catch(() => cached);

            return cached || fetchPromise;
        })
    );
});