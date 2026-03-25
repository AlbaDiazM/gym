const CACHE = 'gymtracker-v1';
const STATIC = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-first for Firebase/API
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Cache-first for CDN assets (Chart.js etc)
  if(url.includes('cdn.jsdelivr.net') || url.includes('cdnjs.cloudflare.com')){
    e.respondWith(
      caches.match(e.request).then(cached => {
        if(cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Network-first for Firebase (auth, firestore, functions)
  if(url.includes('firebase') || url.includes('google') || url.includes('gstatic')){
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for the app itself (HTML)
  if(url.includes('gymtracker') || e.request.mode === 'navigate'){
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: network
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
