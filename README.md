# SignalPay demo v2

SignalPay uses the existing GitHub Pages application and Android WebView app. **No real funds, banking settlement, financial institution connection, SMS delivery or verified personal identity exists.** Every balance is demo data held on the device.

## Account and payment flow

The dashboard shows available demo balance, Scan QR, Receive, Pay Online, Pay Offline and recent transactions. Receive creates a unique account on first use using Web Crypto ECDSA P-256. Its non-exportable private CryptoKey, public identity, signed account QR and ledger are persisted together in IndexedDB. Each browser/PWA storage container or APK has its own account. Restarting retains that account; renaming changes its display name without changing its ID. No shared hardcoded recipient is used for the personal account QR.

QR format version 2 uses `signalpay:2:<base64url JSON>.<base64url signature>`. Account packets contain the format version, public key, public display name, unique receiver ID (128 bits from the SHA-256 public-key fingerprint), and `signalpay:<ID>` account identifier. Private keys are never in QR codes. Signed QR data is public, not encrypted. A valid signature proves control of the account key; it does not verify a person's identity, issuer, funds or creditworthiness. Compare the displayed account ID directly with the receiver.

The sender scans the account QR, enters a bounded PKR amount, selects Continue, reviews receiver/amount/mode, then selects Confirm Payment. This creates a signed offer and a Pending ledger record. The amount is reserved against available demo funds, not debited from the recorded balance. Failed validation shows an error and cannot create an unverified success.

## Exact offline delivery implementation

This is **manual optical device-to-device communication through three QR scans**:

1. Receiver displays their account QR; sender scans it.
2. Sender confirms and displays a signed payment-offer QR. Receiver scans it and explicitly accepts or rejects. Acceptance records incoming demo credit once; rejection records Failed without changing balance.
3. Receiver displays a signed receipt or rejection QR. Sender scans it and verifies receiver key, transaction ID, sender/receiver IDs, PKR amount, mode and SHA-256 offer hash. Only that receipt finalizes sender debit/Successful or releases reserved funds/Failed. Both histories share the same transaction ID.

Lost receipt: reopen the transaction on the receiver and show the same saved receipt. Sender stays Pending with the amount reserved until it returns. There is no unilateral sender cancellation or timeout because the receiver may already have accepted. The receiver's credit and sender's debit are not an atomic distributed transaction: between acceptance and receipt return the receiver has credit while sender has a reserved Pending amount. This window is visible in the UI. Repeating offers or receipts is idempotent; conflicting reused IDs/decisions are rejected. All receipt records are kept for replay checks, with a maximum of 500 transactions; the app refuses new transfers at that limit instead of forgetting old replay protection.

Both devices can generate, sign and decode offline after first preparing the PWA's cached shell. The Android APK bundles its files. Online mode explicitly uses the same manual QR exchange: no online payment server is connected. No Bluetooth, NFC, WebRTC, background delivery, pending-server outbox or automatic reconnect synchronization is implemented. Reconnecting does not send or settle anything.

## Persistence and limitations

IndexedDB read/write transactions serialize ledger updates across tabs. Startup validates signed records and balance invariants and checks that the persisted non-exportable key can still sign. Storage failure or corruption fails closed; the app does not silently replace a lost account or pretend a payment succeeded. Earlier browser-local v1 sample activity remains in its old localStorage key and is not imported as verified v2 transfers. The v2 account starts with PKR 25,000 demo funds.

This is not a trusted financial ledger. A malicious user can tamper with application code or local data, clone/restore state, reset demo funds, or show a self-issued account under any name. Cryptographic signatures and idempotency cannot establish trustworthy funds, prevent all double-spending across cloned/restored devices, or provide banking finality. Clearing site data, browser storage eviction, changing storage containers or uninstalling can lose the identity/receipts. No backup, recovery, central identity, shared login or server reconciliation exists. Do not use real or sensitive data.

Receive offers Copy Account ID and Share QR. Browser sharing uses the platform file share sheet or download fallback. The Android app uses an origin-restricted public PNG bridge and a non-exported FileProvider limited to a QR cache directory; it opens a chooser and never sends automatically. No storage, SMS, microphone or contact permissions are requested. Camera permission is requested only by explicit scan/start actions, and only for the bundled trusted origin. Private keys are not exposed through any native bridge.

## Test and install

`npm test` runs protocol, QR-decoder, cache and ledger checks. `npm ci`, `npx playwright install --with-deps chromium webkit`, then `npm run test:browser` runs UI and cross-engine tests. Test accounts are freshly generated. The browser exchange moves actual generated PNG bytes between isolated sender/receiver contexts and decodes them with the vendored real jsQR library; signatures and ledger updates are not mocked. Android/iPhone profiles are desktop Chromium/WebKit emulations, not physical phones. Network-off tests use browser offline emulation. Physical phone camera scans, actual Wi-Fi/mobile-data toggles, iPhone installed-PWA cold launch, native share targets and audible speech remain unverified unless separately documented.

Public test-only account/payment/receipt PNGs in `test-qrs/` are generated by `node scripts/account-fixtures.cjs`; their private keys are discarded. They exercise decoding and protocol validation, not receive-capable production accounts. Actual personal Receive QR codes always use the current wallet's own persisted key.

GitHub Pages serves `main` at `/signal-app/`. Open `install.html`: Android users update the signed APK; iPhone users use Safari Share → Add to Home Screen, or reopen their existing PWA online until Version 2.0.2 · Offline ready appears. Prepare both devices before disconnecting. Safari and a separately installed APK/PWA may use different accounts; always use the same installation for existing transfers.

The Android APK workflow builds a signed bundle, verifies its certificate/manifest/checksum, installs the release on an emulator, tests WebView key persistence, QR decoding, Pending confirmation, offline signed protocol, duplicate protection, camera and native soundbox. Publication is gated on successful Chromium/WebKit browser verification at the same source commit. Signing remains the existing repository Actions identity; no new repository or signing key is created.

Vendored jsqr 1.4.0 (Apache-2.0) and qrcode-generator 1.4.4 (MIT) retain their license files. No runtime CDN, analytics, real payment API or banking endpoint exists.
