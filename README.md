# SignalPay demo

A static, browser-only payment concept. **No real money moves, no SMS is sent, no bank is connected, and no account identity is verified.** Every recipient, balance, sale and message is fictional sample data.

## Try it

- Scan the sample QR through the actual QR decoder, upload a PNG/JPG/WebP QR image, or start the camera on HTTPS/localhost. Camera frames and uploads stay on the device; no image is uploaded to a server.
- Supported QR payloads: `signalpay-demo:v1:chai`, `signalpay-demo:v1:books`, `signalpay-demo:v1:friend`. All other codes, including actual banking/wallet codes, are rejected. Codes never trigger navigation or automatic payments.
- Review and confirm a payment to debit the sample wallet. Merchant payments also simulate a receipt, SMS preview and soundbox announcement. A standalone incoming sale simulates only merchant activity; it does not credit the customer wallet.
- Activity is stored locally in this browser, capped at the most recent 50 records. Summary counts and merchant receipt totals describe those retained records. Reset restores the initial PKR 25,000 balance. This is not a trusted ledger; browser storage can be edited or cleared, and simultaneous tabs are not a transaction backend.
- Audio uses Web Audio and optional device speech synthesis. Voices and sound availability vary by browser; a text confirmation always remains available. Toggle sound off to mute alerts.
- Camera permission is optional and only requested after Start camera. Tracks stop on Stop camera, switching method, decoding a QR, reset, navigation or hiding the tab. Camera hardware/permissions depend on the device.

## Install on mobile

Open `install.html` over HTTPS. Android users can download the signed APK once `android-release.json` records a verified Release. It requires Android 8.0+ and bundles this repository's web assets. On iPhone, open in Safari and choose Share, Add to Home Screen. The optional installable web demo remains available. Data is fictional and stored only on the device; APK and browser/PWA storage are separate. Uninstalling or clearing app/site data can remove demo history.

## Android app and APK releases

`android/` contains a Java WebView app (`com.signalpay.demo`). It serves bundled web assets through AndroidX WebViewAssetLoader on a local HTTPS origin, with remote WebView navigation blocked. There is no banking backend or SMS service. Only Internet and Camera permissions are declared. Video-only camera permission is granted to the bundled app origin after Android runtime approval; microphone access is denied. QR image selection uses the system document picker. The native soundbox bridge is restricted to the bundled main frame and accepts only a validated fictional amount or stop request.

The `Android APK` workflow uses JDK 17, Gradle 8.11.1, Android Gradle Plugin 8.9.2 and compile/target SDK 35. It bundles the existing web assets, builds a signed release APK, verifies its signature and manifest, installs/launches it on an Android emulator, and runs WebView instrumented tests before publishing a GitHub Release with APK, checksum, signature report, manifest and emulator screenshot. A failed build or emulator check prevents publishing.

The signing PKCS12 and password are stored in encrypted repository Actions secrets `SIGNALPAY_ANDROID_KEYSTORE` and `SIGNALPAY_ANDROID_STORE_PASSWORD`. The public certificate fingerprint is in `android/signing-certificate.sha256`. Do not commit signing keys. Keep this signing identity for future updates and increment `versionCode`, `versionName` and workflow `VERSION` for a new release. Workflow Runs can also be started manually. Existing release tags/assets are not silently overwritten.

Emulator checks exercise real WebView QR decoding, demo wallet/SMS updates, native soundbox requests/mute, emulated camera video/start/stop and navigation restrictions. They do not certify printed-code scanning with physical phone cameras, audible speaker quality, installed voice availability, OEM permission prompts or system image-picker behavior. Those need hands-on device testing.

## Deployment

Publish GitHub Pages from `main` and `/ (root)`. All assets use relative paths, with no build step or hosted service dependency. Hostinger can also serve these same static files later.

For local preview, run any static HTTP server in the repository root. Run `node --test core.test.cjs` to check amount validation, QR restrictions, wallet invariants and scanner decoding.

## Third-party code

Vendored `jsqr@1.4.0` (Apache-2.0; see `jsQR-LICENSE`) and `qrcode-generator@1.4.4` (MIT; see `qrcode-LICENSE`). No runtime CDN requests, analytics, banking, authentication or SMS endpoints are used.
