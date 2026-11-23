(function (root) {
  'use strict';
  const recipients = Object.freeze({ chai: { name: 'Chai Corner', type: 'merchant' }, books: { name: 'Paper & Co.', type: 'merchant' }, friend: { name: 'Demo Friend', type: 'wallet' } });
  const initial = () => ({ balance: 2500000, transactions: [] });
  function amountToCents(value) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a whole or two-decimal amount.');
    const cents = Math.round(Number(value) * 100);
    if (!Number.isSafeInteger(cents) || cents < 100 || cents > 10000000) throw new Error('Choose an amount between PKR 1 and PKR 100,000.');
    return cents;
  }
  function parseQR(raw) {
    const match = /^signalpay-demo:v1:(chai|books|friend)$/.exec(raw);
    if (!match) throw new Error('This is not a SignalPay sample QR. Real banking, wallet and other QR codes are not supported.');
    return match[1];
  }
  function transact(state, input) {
    if (!recipients[input.recipient] || !['payment', 'sale'].includes(input.kind)) throw new Error('Choose a sample recipient.');
    if (!Number.isSafeInteger(input.cents) || input.cents < 100 || input.cents > 10000000) throw new Error('Invalid demo amount.');
    if (input.kind === 'sale' && recipients[input.recipient].type !== 'merchant') throw new Error('Sales require a sample merchant.');
    if (input.kind === 'payment' && input.cents > state.balance) throw new Error('Not enough demo balance. Reset the demo to start again.');
    if (state.transactions.some(t => t.id === input.id)) throw new Error('This simulation was already recorded.');
    return { balance: state.balance - (input.kind === 'payment' ? input.cents : 0), transactions: [{ ...input }, ...state.transactions].slice(0, 50) };
  }
  function validState(value) {
    return value && Number.isSafeInteger(value.balance) && value.balance >= 0 && value.balance <= 2500000 && Array.isArray(value.transactions) && value.transactions.length <= 50 && value.transactions.every(t => t && recipients[t.recipient] && ['payment', 'sale'].includes(t.kind) && Number.isSafeInteger(t.cents) && t.cents >= 100 && t.cents <= 10000000 && typeof t.id === 'string' && t.id.length < 100 && typeof t.time === 'string' && Number.isFinite(Date.parse(t.time)));
  }
  const api = { recipients, initial, amountToCents, parseQR, transact, validState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SignalDemo = api;
})(typeof window !== 'undefined' ? window : globalThis);
