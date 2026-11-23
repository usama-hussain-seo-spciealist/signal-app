'use strict';
const CACHE = 'signalpay-demo-shell-v1.1.0';
const base = new URL('./', self.location.href);
const assets = ['./', './index.html', './install.html', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', './styles.css?v=1.1.0', './install.css?v=1.1.0', './install.js?v=1.1.0', './app.js?v=1.1.0', './core.js?v=1.1.0', './jsQR.js?v=1.1.0', './qrcode.js?v=1.1.0'].map(path => new URL(path, base).href);
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
  if (event.request.mode === 'navigate') {
    const fallback = new URL(url.pathname.endsWith('/install.html') ? './install.html' : './index.html', base).href;
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(fallback))));
    return;
  }
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
