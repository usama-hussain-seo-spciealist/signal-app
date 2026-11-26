console.log(`# SignalPay native iOS test package v3.4.0 — SIGNING REQUIRED

Native UIKit/WKWebView application with bundled offline wallet, AVFoundation QR camera, CoreBluetooth central/peripheral transport, origin-restricted bridges and background PIN lock. Same signed v2 offers/receipts and Nearby v1 encrypted protocol as Android. Receive automatically starts foreground Bluetooth; sender scans receiver account QR once, reviews/confirms; receiver accepts and returns a signed ACK automatically. Sender stays Pending if ACK is missing. Current Bluetooth demo limit PKR1,000. No internet/cellular service is needed for the installed demo exchange; Bluetooth and both apps foreground are required.

This IPA is an **unprovisioned arm64 iPhoneOS signing package**, not a simulator binary, not directly installable, not a signed TestFlight build. Device compilation, architecture/platform, bundled assets, shared framing tests and iOS simulator wallet/lifecycle checks run in GitHub Actions. No physical iPhone↔Android radio transfer has been verified; milestone remains OPEN.

No Mac purchase is needed to build/test in the public repository's standard GitHub macOS runners. For own-device installation without a Mac, evaluate Windows AltStore Classic with your own Apple Account (third-party signing; free-account refresh/expiry and app limits apply). Actual compatibility/install is unverified. Official TestFlight requires Apple Developer Program membership and configured signing/App Store Connect. No signing credentials or paid enrollment are configured by this release. See docs/IOS-SIGNING.md for sources, steps, cost boundaries and user actions.

Preserve data: update the existing PWA/Android to v3.4, unlock and export an encrypted profile backup. Restore in the native iOS app using the same mobile/PIN before creating a new account. Restores audit signed history/identity and add only; existing profiles cannot be overwritten. Same Account ID/QR/contacts/history/pending transactions are preserved in automated migration tests. Source data is kept. Use ONE active copy: local demo balances are not authoritative value and cloning/rollback is not prevented by a trusted issuer. Same signing team/bundle ID is required for future in-place iOS updates; keep backups. No native hardware-key binding, OTP/backend, recovery, real money or bank settlement.

Physical verification steps: docs/DEVICE-TESTS.md. No Soundbox hardware started.

Source: ${process.env.GITHUB_SHA}
Build: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
`);
