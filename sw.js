'use strict';
const CACHE = 'signalpay-demo-shell-v3.0.3';
const base = new URL('./', self.location.href);
const assets = ['./', './index.html', './install.html', './android-release.json', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', './styles.css?v=3.0.3', './install.css?v=3.0.3', './install.js?v=3.0.3', './test-qrs/simple.png', './test-qrs/payment-100.png', './scanner.js?v=3.0.3', './app.js?v=3.0.3', './core.js?v=3.0.3', './account-core.js?v=3.0.3', './account-store.js?v=3.0.3', './auth-crypto.js?v=3.0.3', './auth-store.js?v=3.0.3', './session.js?v=3.0.3', './jsQR.js?v=3.0.3', './qrcode.js?v=3.0.3'].map(path => new URL(path, base).href);
const paths = new Set(assets.map(path => new URL(path).pathname));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assets.map(url => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('signalpay-demo-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !paths.has(url.pathname)) return;
  if (url.pathname === new URL('./android-release.json', base).pathname) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      try { const response = await fetch(event.request); if (!response.ok) throw new Error('Release metadata unavailable'); await cache.put(event.request, response.clone()); return response; }
      catch (_) { return cache.match(event.request); }
    }));
    return;
  }
  if (event.request.mode === 'navigate') {
    const fallback = new URL(url.pathname.endsWith('/install.html') ? './install.html' : './index.html', base).href;
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(fallback))));
    return;
  }
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
