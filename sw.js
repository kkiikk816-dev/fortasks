const cacheName = 'oxygen-v1';
const assets = ['index.html', 'style.css', 'script.js'];

// تثبيت الخدمة وتخزين الملفات الأساسية
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(cacheName).then(cache => {
            cache.addAll(assets);
        })
    );
});

// تشغيل التطبيق حتى عند عدم وجود إنترنت
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => {
            return res || fetch(e.request);
        })
    );
});
