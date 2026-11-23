const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const scope = 'https://example.github.io/signal-app/';
function worker() {
  const handlers = {}, deleted = [], store = new Map();
  const caches = { keys: async () => ['another-app', 'signalpay-demo-shell-old'], delete: async key => deleted.push(key), open: async () => ({ addAll: async requests => requests.forEach(request => store.set(request.url, 'cached:' + request.url)), match: async request => store.get(typeof request === 'string' ? request : request.url) }) };
  const context = { self: { location: { href: scope + 'sw.js' }, addEventListener: (name, fn) => handlers[name] = fn, skipWaiting: async () => {}, clients: { claim: async () => {} } }, caches, URL, Request, fetch: async () => { throw new Error('offline'); } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8'), context);
  return { handlers, deleted, store };
}
test('manifest and icons resolve inside the GitHub Pages project', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.webmanifest'), 'utf8'));
  assert.equal(new URL(manifest.scope, scope).href, scope);
  assert.equal(new URL(manifest.start_url, scope).pathname, '/signal-app/');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const data = fs.readFileSync(path.join(__dirname, icon.src));
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(data.readUInt32BE(16), size); assert.equal(data.readUInt32BE(20), size);
  }
});
test('offline cache only contains shipped project files', async () => {
  const { handlers, store } = worker();
  let work; handlers.install({ waitUntil: promise => work = promise }); await work;
  assert.ok(store.has(scope + 'index.html')); assert.ok(store.has(scope + 'install.html'));
  for (const url of store.keys()) { const file = new URL(url).pathname.slice('/signal-app/'.length) || 'index.html'; assert.ok(fs.existsSync(path.join(__dirname, file)), file); }
});
test('offline navigation opens the app shell and ignores unrelated sites', async () => {
  const { handlers, store } = worker();
  store.set(scope + 'index.html', 'demo-shell'); store.set(scope + 'install.html', 'install-shell');
  for (const [url, expected] of [[scope + '?source=homescreen', 'demo-shell'], [scope + 'install.html', 'install-shell']]) {
    let response; handlers.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: promise => response = promise }); assert.equal(await response, expected);
  }
  for (const url of ['https://other.example/', 'https://example.github.io/other-app/']) {
    let intercepted = false; handlers.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: () => intercepted = true }); assert.equal(intercepted, false);
  }
});
test('activation removes only old SignalPay shell caches', async () => {
  const { handlers, deleted } = worker(); let work;
  handlers.activate({ waitUntil: promise => work = promise }); await work;
  assert.deepEqual(deleted, ['signalpay-demo-shell-old']);
});
