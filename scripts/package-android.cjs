'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'android/app/src/main/assets/www');
fs.mkdirSync(destination, { recursive: true });
const assets = ['updates.js','app-version.json','soundbox.js','receipt-chime.wav','index.html','app.js','core.js','account-core.js','account-store.js','auth-crypto.js','auth-store.js','session.js','scanner.js','styles.css','jsQR.js','qrcode.js','icon.svg','icon-180.png','icon-192.png','icon-512.png','install.html','install.css','install.js','manifest.webmanifest','jsQR-LICENSE','qrcode-LICENSE'];
for (const file of assets) fs.copyFileSync(path.join(root, file), path.join(destination, file));
// Every APK uses the web application at the same source commit. No remote code is loaded.
console.log(`Bundled ${assets.length} existing web assets for Android.`);

fs.cpSync(path.join(root, 'test-qrs'), path.join(destination, 'test-qrs'), { recursive: true });
