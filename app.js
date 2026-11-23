/* All records are fictional browser-local state. No payment or SMS API exists. */
'use strict';
const $ = id => document.getElementById(id);
const D = window.SignalDemo;
const storageKey = 'signalpay-demo-v1';
let state = D.initial(), storageAvailable = true, pending = null, toastTimer, stream = null, cameraToken = 0, scanTimer, audioContext;
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
  const qr = qrcode(0, 'M'); qr.addData('signalpay-demo:v1:chai'); qr.make();
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
function decodeCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(pixels.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
  if (!result) throw new Error('No readable QR found. Use a clear, well-lit image or try the sample QR.');
  return D.parseQR(result.data);
}
function selectScannedRecipient(id) {
  $('recipient').value = id; stopCamera();
  $('scanStatus').textContent = 'Sample QR read: ' + D.recipients[id].name + '. Fictional recipient; identity not verified. Review the amount below.';
  $('amount').focus();
}
$('sampleScan').addEventListener('click', () => {
  try {
    selectScannedRecipient(decodeCanvas(sampleCanvas(sampleQR)));
  } catch (error) { $('scanStatus').textContent = error.message; }
});
function stopCamera() {
  cameraToken++; clearTimeout(scanTimer); if (stream) stream.getTracks().forEach(track => track.stop()); stream = null;
  $('video').srcObject = null; $('video').hidden = true; $('scanPlaceholder').hidden = false; $('stopCamera').hidden = true; $('startCamera').disabled = false;
}
$('stopCamera').addEventListener('click', () => { stopCamera(); $('scanStatus').textContent = 'Camera stopped. You can scan the sample or upload a QR image.'; });
$('startCamera').addEventListener('click', async () => {
  stopCamera(); const token = cameraToken; $('startCamera').disabled = true;
  if (!navigator.mediaDevices?.getUserMedia) { $('scanStatus').textContent = 'Camera is unavailable in this browser. Use the sample QR or upload an image.'; $('startCamera').disabled = false; return; }
  $('scanStatus').textContent = 'Waiting for camera permission. Camera frames stay on this device.';
  try {
    const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } }, audio: false });
    if (token !== cameraToken || document.hidden) { acquired.getTracks().forEach(t => t.stop()); return; }
    stream = acquired; const video = $('video'); video.srcObject = stream; video.hidden = false; $('scanPlaceholder').hidden = true; $('stopCamera').hidden = false; await video.play();
    if (token !== cameraToken) return;
    $('scanStatus').textContent = 'Point your camera at a SignalPay sample QR. Real payment codes are unsupported.';
    const canvas = document.createElement('canvas');
    const scan = () => {
      if (token !== cameraToken || !stream) return;
      if (video.readyState >= 2 && video.videoWidth) {
        const scale = Math.min(1, 640 / video.videoWidth); canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(pixels.data, canvas.width, canvas.height);
        if (result) { try { selectScannedRecipient(D.parseQR(result.data)); } catch (error) { stopCamera(); $('scanStatus').textContent = error.message; } return; }
      }
      scanTimer = setTimeout(scan, 180);
    }; scan();
  } catch (error) {
    if (token !== cameraToken) return; stopCamera();
    $('scanStatus').textContent = error.name === 'NotAllowedError' ? 'Camera permission was denied. Use the sample QR or upload an image instead.' : 'Could not start the camera. Check that it is available, or use the sample QR.';
  }
});
$('qrFile').addEventListener('change', async event => {
  stopCamera(); const file = event.target.files[0]; if (!file) return;
  if (file.size > 10000000) { $('scanStatus').textContent = 'Choose a QR image smaller than 10 MB.'; event.target.value = ''; return; }
  let bitmap;
  try { bitmap = await createImageBitmap(file); const ratio = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio); const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); selectScannedRecipient(decodeCanvas(canvas)); }
  catch (error) { $('scanStatus').textContent = error.message.startsWith('This is') || error.message.startsWith('No readable') ? error.message : 'Could not read this image. Try a PNG, JPG or WebP sample QR.'; }
  finally { bitmap?.close(); event.target.value = ''; }
});
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
$('confirmReset').addEventListener('click', () => { stopCamera(); pending = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); state = D.initial(); persist(); render(); $('sms').textContent = 'Your simulated payment message will appear here. No phone number needed.'; $('scanStatus').textContent = 'Camera stays off until you start it. QR images are processed on your device.'; $('soundStatus').textContent = 'Audio plays on this device only.'; $('amount').value = '250'; $('recipient').value = 'chai'; $('resetDialog').close(); toast('Fresh demo ready. Sample balance restored.'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopCamera(); if ('speechSynthesis' in window) speechSynthesis.cancel(); } });
window.addEventListener('pagehide', stopCamera);
window.addEventListener('storage', event => { if (event.key !== storageKey) return; try { const next = JSON.parse(event.newValue); state = D.validState(next) ? next : D.initial(); pending = null; $('reviewDialog').close(); render(); toast('Demo activity was updated in another tab.'); } catch (_) {} });
render();
if (!storageAvailable) toast('Browser storage is unavailable. The demo still works for this page session.');
