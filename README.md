# SignalPay demo

A static, browser-only payment concept. **No real money moves, no SMS is sent, no bank is connected, and no account identity is verified.** Every recipient, balance, sale and message is fictional sample data.

## Try it

- Scan the sample QR through the actual QR decoder, upload a PNG/JPG/WebP QR image, or start the camera on HTTPS/localhost. Camera frames and uploads stay on the device; no image is uploaded to a server.
- Every readable text QR displays its exact decoded data, independently of payment validation. Demo payment payloads include legacy `signalpay-demo:v1:chai` (also books/friend) and `signalpay-demo:v2:chai:PKR:100.00`. Only known fictional receiver IDs and bounded PKR amounts can populate a demo draft, through a separate explicit button. Other QR contents cannot trigger navigation or payments.
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

For local preview, run any static HTTP server in the repository root. `npm test` runs 20 Node tests; `npm ci`, `npx playwright install --with-deps chromium webkit`, then `npm run test:browser` runs controlled browser checks. The QR browser verification workflow publishes its results and failure traces. The two deterministic PNG fixtures in `test-qrs/` are generated with `node scripts/qr-fixtures.cjs` and decoded with the real vendored jsQR library in both Node and browser tests.

## Scanner fix and verification limits (1.3.0)

The previous scanner decoded frames then immediately passed the result through a strict payment parser. A successfully decoded plain-text QR was rejected and the camera stopped without showing its raw data. Payment QR success also hid the camera and focused the amount field. The updated scanner separates raw decoding, persistent result display, optional payment classification and explicit draft selection. Timer callback errors are caught, transient frame errors retry, track interruption/permission failures have actionable messages, and late streams after cancellation are stopped. iOS uses inline muted video and an image-element upload path without requiring createImageBitmap. Raw data is inserted with textContent; it never opens a URL or executes HTML. The last result is stored only on this browser and can be cleared.

All decoder scripts, test PNGs and the app shell are cached by service worker v1.3.0. Open online until the version and Offline ready message appear before testing a cold offline reopen. Browser storage eviction or clearing site data requires an online recache. Automated offline emulation is distinct from turning off a physical iPhone's Wi-Fi and mobile data. WebKit desktop automation checks image decoding and UI, not physical iPhone camera access, PWA lifecycle or audible speaker output.

**Offline device-to-device payments are not implemented.** There is no sender/receiver transport, receiver acknowledgment, receiver balance/history update, durable pending outbox, server ledger or reconnect synchronization. A localStorage event updates tabs in the same browser; it does not communicate between devices. The merchant panel and soundbox on the sender are local simulated previews. A separate-browser test confirms that the receiver does not gain balance or history after the sender's simulation. This is a limitation audit, not a successful offline transfer test.

## Third-party code

Vendored `jsqr@1.4.0` (Apache-2.0; see `jsQR-LICENSE`) and `qrcode-generator@1.4.4` (MIT; see `qrcode-LICENSE`). No runtime CDN requests, analytics, banking, authentication or SMS endpoints are used.
