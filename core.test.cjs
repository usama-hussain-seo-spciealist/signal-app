const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('./core.js');
const qr = require('./qrcode.js');
const decode = require('./jsQR.js');
const tx = overrides => ({ id: 'DEMO-test', time: new Date().toISOString(), kind: 'payment', recipient: 'chai', cents: 25000, ...overrides });
test('amounts preserve paise and reject unsupported values', () => {
  assert.equal(D.amountToCents('250.01'), 25001);
  for (const value of ['0', '-1', '1.001', 'Infinity', '1e3', '100000.01', '', '<script>']) assert.throws(() => D.amountToCents(value));
});
test('QR parsing only accepts exact fictional codes', () => {
  assert.equal(D.parseQR('signalpay-demo:v1:books'), 'books');
  for (const code of ['https://bank.example/transfer', 'upi://pay?pa=account', 'signalpay-demo:v1:chai<script>', 'signalpay-demo:v2:chai', 'signalpay-demo:v1:chai\n']) assert.throws(() => D.parseQR(code));
});
test('payments debit demo wallet once and never overdraft', () => {
  const before = D.initial(); const after = D.transact(before, tx());
  assert.equal(after.balance, 2475000); assert.equal(before.balance, 2500000);
  assert.equal(after.transactions.length, 1);
  assert.throws(() => D.transact(after, tx()));
  assert.throws(() => D.transact({ balance: 100, transactions: [] }, tx()));
  assert.throws(() => D.transact(before, tx({ cents: NaN })));
  assert.throws(() => D.transact(before, tx({ recipient: 'real-bank' })));
});
test('incoming sales do not credit the customer wallet; history stays bounded', () => {
  let state = D.initial();
  for (let i = 0; i < 60; i++) state = D.transact(state, tx({ kind: 'sale', id: `DEMO-${i}` }));
  assert.equal(state.balance, 2500000); assert.equal(state.transactions.length, 50);
  assert.equal(state.transactions[0].id, 'DEMO-59');
  assert.throws(() => D.transact(state, tx({ kind: 'sale', recipient: 'friend' })));
});
test('corrupt local storage is rejected', () => {
  assert.ok(D.validState(D.initial()));
  for (const data of [null, { balance: -1, transactions: [] }, { balance: 100, transactions: [tx({ recipient: '<script>' })] }, { balance: 100, transactions: [tx({ time: 'invalid' })] }]) assert.ok(!D.validState(data));
});
test('real QR decoder reads rendered sample modules', () => {
  const code = qr(0, 'M'); code.addData('signalpay-demo:v1:chai'); code.make();
  const count = code.getModuleCount(), scale = 8, size = (count + 8) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (code.isDark(r, c)) for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
    const i = (((r + 4) * scale + y) * size + (c + 4) * scale + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
  }
  const result = decode(pixels, size, size);
  assert.equal(D.parseQR(result.data), 'chai');
});
