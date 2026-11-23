/* All records are fictional browser-local state. No payment or SMS API exists. */
'use strict';
const $ = id => document.getElementById(id);
const D = window.SignalDemo;
const storageKey = 'signalpay-demo-v1';
let state = D.initial(), storageAvailable = true, pending = null, toastTimer, audioContext;
try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (D.validState(saved)) state = saved; } catch (_) { storageAvailable = false; }
const money = cents => 'PKR ' + (cents / 100).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6500); }
function persist() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) { storageAvailable = false; toast('Simulation complete. Browser storage is unavailable; activity lasts until you reload.'); } }
function cell(row, text, className) { const td = document.createElement('td'); td.textContent = text; if (className) td.className = className; row.append(td); return td; }
function render() {
  $('balance').textContent = money(state.balance);
  $('paymentCount').textContent = state.transactions.filter(t => t.kind === 'payment').length;
  $('receivedTotal').textContent = money(state.transactions.filter(t => t.kind === 'sale' || D.recipients[t.recipient].type === 'merchant').reduce((sum, t) => sum + t.cents, 0));
  const rows = $('activityRows'); rows.textContent = '';
  if (!state.transactions.length) { const tr = document.createElement('tr'); const td = cell(tr, 'Your first demo payment starts a story. Try scanning the sample QR.', 'empty-state'); td.colSpan = 5; rows.append(tr); return; }
  for (const t of state.transactions) {
    const tr = document.createElement('tr'); const name = cell(tr, D.recipients[t.recipient].name, 'tx-name'); const sub = document.createElement('small'); sub.textContent = t.id; name.append(sub);
    cell(tr, t.kind === 'sale' ? 'Incoming sale' : 'Demo payment'); cell(tr, (t.kind === 'sale' ? '+ ' : '− ') + money(t.cents), t.kind === 'sale' ? 'received' : '');
    const status = cell(tr, ''); const badge = document.createElement('span'); badge.className = 'tx-status'; badge.textContent = 'Simulated'; status.append(badge);
    cell(tr, new Date(t.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })); rows.append(tr);
  }
}
function makeQR() {
  const qr = qrcode(0, 'M'); qr.addData('signalpay-demo:v2:chai:PKR:100.00'); qr.make();
  $('merchantQR').innerHTML = qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true });
  $('downloadQR').href = sampleCanvas(qr).toDataURL('image/png');
  return qr;
}
const sampleQR = makeQR();
function sampleCanvas(qr) {
  const size = qr.getModuleCount(), scale = 8, margin = 4;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = (size + margin * 2) * scale;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000';
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (qr.isDark(r, c)) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
  return canvas;
}
let scannedPayment = null, imageGeneration = 0;
const resultKey = 'signalpay-last-qr-v1';
function showDecoded(raw, source, restored = false) {
  $('decodedResult').hidden = false;
  $('decodedData').textContent = raw;
  $('decodedSource').textContent = (restored ? 'Saved result · ' : 'Decoded successfully · ') + source;
  $('scanStatus').textContent = 'QR decoded successfully. Camera stopped intentionally; exact data is kept below.';
  scannedPayment = null;
  try {
    scannedPayment = D.parsePaymentQR(raw);
    $('decodedMeaning').textContent = 'Demo receiver ID: ' + scannedPayment.recipient + ' · ' + D.recipients[scannedPayment.recipient].name + (scannedPayment.cents === null ? ' · Choose an amount below.' : ' · ' + money(scannedPayment.cents)) + '. Fictional identity, not verified. No payment has been made.';
  } catch (_) { $('decodedMeaning').textContent = 'Text QR decoded successfully. It is not a supported demo payment code. No payment was created and no link was opened.'; }
  $('useScanned').hidden = !scannedPayment;
  if (!restored) try { localStorage.setItem(resultKey, JSON.stringify({ raw, source })); } catch (_) {}
}
const camera = SignalScanner.createCamera({
  video: $('video'), canvas: document.createElement('canvas'), media: navigator.mediaDevices, decoder: jsQR,
  status: message => $('scanStatus').textContent = message,
  preview: active => { $('video').hidden = !active; $('scanPlaceholder').hidden = active; $('stopCamera').hidden = !active; $('startCamera').disabled = active; },
  result: showDecoded
});
function stopCamera() { imageGeneration++; camera.stop(); }
$('startCamera').addEventListener('click', () => { imageGeneration++; camera.start(); });
$('stopCamera').addEventListener('click', () => { stopCamera(); $('scanStatus').textContent = 'Camera stopped. Last decoded result remains below. Start again or upload a QR image.'; });
$('sampleScan').addEventListener('click', () => {
  stopCamera();
  try { const raw = SignalScanner.decode(sampleCanvas(sampleQR), jsQR); if (raw === null) throw new Error('Sample QR could not be decoded. Reload the updated app.'); showDecoded(raw, 'Generated demo QR'); }
  catch (error) { $('scanStatus').textContent = error.message; }
});
$('useScanned').addEventListener('click', () => {
  if (!scannedPayment) return;
  $('recipient').value = scannedPayment.recipient;
  if (scannedPayment.cents !== null) $('amount').value = (scannedPayment.cents / 100).toFixed(2);
  $('scanStatus').textContent = 'Demo details copied below. Review and confirm separately. This does not deliver a payment to another device.';
});
$('clearDecoded').addEventListener('click', () => { scannedPayment = null; $('decodedResult').hidden = true; $('decodedData').textContent = ''; try { localStorage.removeItem(resultKey); } catch (_) {} });
async function decodeImage(blob, source) {
  stopCamera(); const token = imageGeneration;
  const url = URL.createObjectURL(blob), image = new Image();
  $('scanStatus').textContent = 'Reading QR image on this device…';
  try {
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Image could not open. Choose a PNG, JPG or WebP image.')); image.src = url; });
    if (token !== imageGeneration) return;
    const ratio = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const raw = SignalScanner.decode(canvas, jsQR);
    if (raw === null) throw new Error('No readable QR found. Include the full square and white border; use a sharp, well-lit image. Your previous result is kept.');
    showDecoded(raw, source);
  } catch (error) { if (token === imageGeneration) $('scanStatus').textContent = error.message; }
  finally { URL.revokeObjectURL(url); }
}
$('qrFile').addEventListener('change', event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  if (file.size > 10000000) { $('scanStatus').textContent = 'Choose an image smaller than 10 MB.'; return; }
  decodeImage(file, 'Uploaded image');
});
document.querySelectorAll('[data-test-qr]').forEach(button => button.addEventListener('click', async () => {
  stopCamera(); const token = imageGeneration;
  try { const response = await fetch('./test-qrs/' + button.dataset.testQr + '.png'); if (!response.ok) throw new Error(); const blob = await response.blob(); if (token === imageGeneration) await decodeImage(blob, 'Test PNG: ' + button.dataset.testQr); }
  catch (_) { if (token === imageGeneration) $('scanStatus').textContent = 'Test image is not available. Open online once until Offline ready appears, then retry offline.'; }
}));
try { const saved = JSON.parse(localStorage.getItem(resultKey)); if (saved && typeof saved.raw === 'string' && saved.raw.length <= 10000) showDecoded(saved.raw, 'previous scan', true); } catch (_) {}
function offlineStatus() {
  const el = $('offlineStatus');
  if (!('serviceWorker' in navigator) || location.hostname === 'appassets.androidplatform.net') { el.textContent = 'Version 1.3.0 · Bundled local demo. No device-to-device delivery or pending synchronization.'; return; }
  el.textContent = 'Version 1.3.0 · Preparing offline files. Keep this app open online briefly.';
  navigator.serviceWorker.ready.then(async () => {
    const keys = await caches.keys();
    if (!keys.includes('signalpay-demo-shell-v1.3.0')) { el.textContent = 'Version 1.3.0 · Offline update pending. Close and reopen while online.'; return; }
    el.textContent = 'Version 1.3.0 · Offline ready on this browser. QR decoding needs no internet. Payments stay on this device; no delivery or sync.';
  }).catch(() => { el.textContent = 'Version 1.3.0 · Offline files unavailable. Reopen online to cache them.'; });
}
offlineStatus();
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', offlineStatus);
function chooseTab(scan) { stopCamera(); $('scanView').hidden = !scan; $('scanTab').setAttribute('aria-pressed', String(scan)); $('manualTab').setAttribute('aria-pressed', String(!scan)); }
$('scanTab').addEventListener('click', () => chooseTab(true)); $('manualTab').addEventListener('click', () => chooseTab(false));
document.querySelectorAll('[data-amount]').forEach(button => button.addEventListener('click', () => $('amount').value = button.dataset.amount));
function prepareAudio() { try { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume().catch(() => {}); } catch (_) {} }
function announce(cents) {
  if (!$('soundEnabled').checked) { $('soundStatus').textContent = 'Sound muted. The simulated receipt is still shown.'; return; }
  prepareAudio(); let played = false;
  try { if (audioContext) { const start = audioContext.currentTime; [660, 880, 1100].forEach((frequency, i) => { const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(); oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, start + i * .12); gain.gain.exponentialRampToValueAtTime(.09, start + i * .12 + .02); gain.gain.exponentialRampToValueAtTime(.0001, start + i * .12 + .2); oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start + i * .12); oscillator.stop(start + i * .12 + .22); }); played = true; } } catch (_) {}
  if (window.SignalSoundbox) {
    window.SignalSoundbox.onmessage = event => $('soundStatus').textContent = event.data;
    window.SignalSoundbox.postMessage(JSON.stringify({ action: 'speak', cents })); played = true;
  } else if ('speechSynthesis' in window) {
    speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance('Demo payment received. ' + cents / 100 + ' Pakistani rupees. This is a simulation.'); speech.lang = 'en-PK'; speech.rate = .95;
    speech.onerror = () => $('soundStatus').textContent = 'Voice is unavailable. The soundbox message is shown here: demo payment received, ' + money(cents) + '.';
    speechSynthesis.speak(speech); played = true;
  }
  $('soundStatus').textContent = played ? 'Soundbox preview: Demo payment received, ' + money(cents) + '. Audio depends on device volume and browser voice support.' : 'Audio is unavailable. Demo payment received: ' + money(cents) + '.';
}
$('testSound').addEventListener('click', () => announce(50000));
$('soundEnabled').addEventListener('change', () => { if (!$('soundEnabled').checked) { if ('speechSynthesis' in window) speechSynthesis.cancel(); window.SignalSoundbox?.postMessage(JSON.stringify({ action: 'stop' })); } $('soundStatus').textContent = $('soundEnabled').checked ? 'Sound on for the next simulated merchant receipt.' : 'Sound muted.'; });
function finish(input) {
  state = D.transact(state, input); persist(); render();
  const recipient = D.recipients[input.recipient];
  $('sms').textContent = '[SIMULATION — NOT SENT] ' + (input.kind === 'sale' ? 'Merchant demo: received ' : 'Demo wallet: paid ') + money(input.cents) + (input.kind === 'sale' ? ' at ' : ' to ') + recipient.name + '. Ref ' + input.id + '. No real transfer occurred.';
  if (input.kind === 'sale' || recipient.type === 'merchant') announce(input.cents);
  toast(storageAvailable ? 'Simulation recorded. No real money moved and no SMS was sent.' : 'Simulation recorded for this page session. Browser storage is unavailable.');
}
function transaction(recipient, kind, cents) { return { recipient, kind, cents, id: 'DEMO-' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase(), time: new Date().toISOString() }; }
$('paymentForm').addEventListener('submit', event => {
  event.preventDefault();
  try { const cents = D.amountToCents($('amount').value); if (cents > state.balance) throw new Error('Not enough demo balance. Try a smaller amount or reset the demo.'); pending = transaction($('recipient').value, 'payment', cents); $('reviewRecipient').textContent = D.recipients[pending.recipient].name; $('reviewAmount').textContent = money(cents); $('reviewDialog').showModal(); }
  catch (error) { toast(error.message); }
});
$('cancelPayment').addEventListener('click', () => { pending = null; $('reviewDialog').close(); });
$('reviewDialog').addEventListener('cancel', () => pending = null);
$('confirmPayment').addEventListener('click', () => {
  if (!pending) return; const input = pending; pending = null; $('confirmPayment').disabled = true; prepareAudio();
  try { finish(input); $('reviewDialog').close(); } catch (error) { toast(error.message); } finally { $('confirmPayment').disabled = false; }
});
$('receive').addEventListener('click', () => { prepareAudio(); try { finish(transaction('chai', 'sale', 50000)); } catch (error) { toast(error.message); } });
$('reset').addEventListener('click', () => $('resetDialog').showModal()); $('cancelReset').addEventListener('click', () => $('resetDialog').close());
$('confirmReset').addEventListener('click', () => { stopCamera(); $('clearDecoded').click(); pending = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); state = D.initial(); persist(); render(); $('sms').textContent = 'Your simulated payment message will appear here. No phone number needed.'; $('scanStatus').textContent = 'Camera stays off until you start it. QR images are processed on your device.'; $('soundStatus').textContent = 'Audio plays on this device only.'; $('amount').value = '250'; $('recipient').value = 'chai'; $('resetDialog').close(); toast('Fresh demo ready. Sample balance restored.'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopCamera(); if ('speechSynthesis' in window) speechSynthesis.cancel(); } });
window.addEventListener('pagehide', stopCamera);
window.addEventListener('storage', event => { if (event.key !== storageKey) return; try { const next = JSON.parse(event.newValue); state = D.validState(next) ? next : D.initial(); pending = null; $('reviewDialog').close(); render(); toast('Demo activity was updated in another tab.'); } catch (_) {} });
render();
if (!storageAvailable) toast('Browser storage is unavailable. The demo still works for this page session.');
