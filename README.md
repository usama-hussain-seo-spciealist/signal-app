# SignalPay demo

A static, browser-only payment concept. **No real money moves, no SMS is sent, no bank is connected, and no account identity is verified.** Every recipient, balance, sale and message is fictional sample data.

## Try it

- Scan the sample QR through the actual QR decoder, upload a PNG/JPG/WebP QR image, or start the camera on HTTPS/localhost. Camera frames and uploads stay on the device; no image is uploaded to a server.
- Supported QR payloads: `signalpay-demo:v1:chai`, `signalpay-demo:v1:books`, `signalpay-demo:v1:friend`. All other codes, including actual banking/wallet codes, are rejected. Codes never trigger navigation or automatic payments.
- Review and confirm a payment to debit the sample wallet. Merchant payments also simulate a receipt, SMS preview and soundbox announcement. A standalone incoming sale simulates only merchant activity; it does not credit the customer wallet.
- Activity is stored locally in this browser, capped at the most recent 50 records. Summary counts and merchant receipt totals describe those retained records. Reset restores the initial PKR 25,000 balance. This is not a trusted ledger; browser storage can be edited or cleared, and simultaneous tabs are not a transaction backend.
- Audio uses Web Audio and optional device speech synthesis. Voices and sound availability vary by browser; a text confirmation always remains available. Toggle sound off to mute alerts.
- Camera permission is optional and only requested after Start camera. Tracks stop on Stop camera, switching method, decoding a QR, reset, navigation or hiding the tab. Camera hardware/permissions depend on the device.

## Hosting

Publish GitHub Pages from `main` and `/ (root)`. All assets use relative paths, with no build step or hosted service dependency. Hostinger can also serve these same static files later.

For local preview, run any static HTTP server in the repository root. Run `node --test core.test.cjs` to check amount validation, QR restrictions, wallet invariants and scanner decoding.

## Third-party code

Vendored `jsqr@1.4.0` (Apache-2.0; see `jsQR-LICENSE`) and `qrcode-generator@1.4.4` (MIT; see `qrcode-LICENSE`). No runtime CDN requests, analytics, banking, authentication or SMS endpoints are used.
