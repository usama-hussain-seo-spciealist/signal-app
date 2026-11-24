'use strict';
(() => {
  let installPrompt = null;
  const button = document.getElementById('installButton');
  const status = document.getElementById('installStatus');
  const help = document.getElementById('installHelp');
  if (location.hostname === 'appassets.androidplatform.net') {
    const installLink = document.querySelector('.header-actions a[href="./install.html"]');
    if (installLink) { installLink.textContent = 'Android demo'; installLink.removeAttribute('href'); }
  }
  const standalone = window.matchMedia('(display-mode: standalone)');
  function installed() {
    if (button) { button.textContent = 'Web app installed'; button.disabled = true; }
    if (status) status.textContent = 'SignalPay Demo is ready. Open it from your home screen.';
  }
  if (standalone.matches || navigator.standalone) installed();
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (button) { button.textContent = 'Install web app instead'; button.disabled = false; }
    if (status) status.textContent = 'Optional: install the web demo from this browser.';
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
        if (status && button.textContent !== 'Web app installed') status.textContent = 'Web app installation requested. Follow your browser confirmation.';
      } else if (status) status.textContent = 'Installation was dismissed. You can still use Open demo, or install from the browser menu later.';
    } catch (_) { if (status) status.textContent = 'The install prompt could not open. Use your browser menu and the steps below.'; }
    finally { if (button.textContent !== 'Web app installed') button.disabled = false; }
  });
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    const iphone = document.getElementById('iphoneHelp'), android = document.getElementById('androidHelp');
    if (iphone) iphone.open = true; if (android) android.open = false;
    if (status && !standalone.matches && !navigator.standalone) status.textContent = 'On iPhone, open in Safari, then use Share and Add to Home Screen.';
    if (button && !standalone.matches && !navigator.standalone) button.textContent = 'Show iPhone install steps';
    document.getElementById('apkPending')?.setAttribute('hidden', '');
    const apkStatus = document.getElementById('apkStatus');
    if (apkStatus) apkStatus.textContent = 'iPhone: use the Safari home-screen instructions below.';
  }
  const download = document.getElementById('downloadAPK');
  if (download && !ios) {
    fetch('./android-release.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error('Release unavailable'); return response.json(); }).then(release => {
      const prefix = 'https://github.com/usama-hussain-seo-spciealist/signal-app/releases/';
      if (release.verified !== true || !release.url?.startsWith(prefix + 'download/') || !release.url.endsWith('.apk') || !/^[a-f0-9]{64}$/.test(release.sha256)) throw new Error('Release not verified');
      download.href = release.url; download.hidden = false;
      document.getElementById('apkPending').hidden = true;
      document.getElementById('apkStatus').textContent = 'Android 8.0+ · v' + release.version + ' · ' + (release.bytes / 1048576).toFixed(1) + ' MB · Signed demo APK';
      const details = document.getElementById('releaseDetails'), build = document.getElementById('buildDetails');
      if (release.releaseUrl?.startsWith(prefix)) { details.href = release.releaseUrl; details.parentElement.hidden = false; }
      if (release.buildUrl?.startsWith('https://github.com/usama-hussain-seo-spciealist/signal-app/actions/runs/')) build.href = release.buildUrl;
    }).catch(() => { document.getElementById('apkStatus').textContent = 'APK download is unavailable right now. Use Open demo or try again online.'; });
  }
  if ('serviceWorker' in navigator && window.isSecureContext && location.hostname !== 'appassets.androidplatform.net') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
        .then(() => navigator.serviceWorker.ready)
        .then(() => { const offline = document.getElementById('offlineStatus'); if (offline && !document.getElementById('decodedResult')) offline.textContent = 'Demo saved on this device for offline use. Camera and audio still depend on your browser and device.'; })
        .catch(() => { const offline = document.getElementById('offlineStatus'); if (offline) offline.textContent = 'Offline saving is unavailable in this browser. You can still use the demo online.'; });
    }, { once: true });
  }
})();
