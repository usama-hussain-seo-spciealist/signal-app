'use strict';
(() => {
  let installPrompt = null;
  const button = document.getElementById('installButton');
  const status = document.getElementById('installStatus');
  const help = document.getElementById('installHelp');
  const standalone = window.matchMedia('(display-mode: standalone)');
  function installed() {
    if (button) { button.textContent = 'App installed'; button.disabled = true; }
    if (status) status.textContent = 'SignalPay Demo is ready. Open it from your home screen.';
  }
  if (standalone.matches || navigator.standalone) installed();
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (button) { button.textContent = 'Install app'; button.disabled = false; }
    if (status) status.textContent = 'Ready to install. Tap Install app to add SignalPay Demo.';
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; installed(); });
  standalone.addEventListener('change', event => { if (event.matches) installed(); });
  if (button) button.addEventListener('click', async () => {
    if (!installPrompt) {
      if (status) status.textContent = 'Use your browser menu to add SignalPay to the home screen. Follow the steps below.';
      help?.focus(); help?.scrollIntoView({ block: 'nearest' }); return;
    }
    const prompt = installPrompt; installPrompt = null; button.disabled = true;
    try {
      await prompt.prompt(); const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        if (status && button.textContent !== 'App installed') status.textContent = 'Installation requested. Follow your browser confirmation; the app icon will appear on your home screen.';
      } else if (status) status.textContent = 'Installation was dismissed. You can still use Open demo, or install from the browser menu later.';
    } catch (_) { if (status) status.textContent = 'The install prompt could not open. Use your browser menu and the steps below.'; }
    finally { if (button.textContent !== 'App installed') button.disabled = false; }
  });
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    const iphone = document.getElementById('iphoneHelp'), android = document.getElementById('androidHelp');
    if (iphone) iphone.open = true; if (android) android.open = false;
    if (status && !standalone.matches && !navigator.standalone) status.textContent = 'On iPhone, open in Safari, then use Share and Add to Home Screen.';
  }
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
        .then(() => navigator.serviceWorker.ready)
        .then(() => { const offline = document.getElementById('offlineStatus'); if (offline) offline.textContent = 'Demo saved on this device for offline use. Camera and audio still depend on your browser and device.'; })
        .catch(() => { const offline = document.getElementById('offlineStatus'); if (offline) offline.textContent = 'Offline saving is unavailable in this browser. You can still use the demo online.'; });
    }, { once: true });
  }
})();
