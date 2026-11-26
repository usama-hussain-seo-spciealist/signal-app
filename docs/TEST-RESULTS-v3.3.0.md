# SignalPay v3.3.0 test results — 26 November 2026

Source tested and tagged: `9f746f4f2832a46b9f1dd26f7f3f364c73833f60`, tag `android-v3.3.0`. This is a **demo foundation release**, not completion of the iPhone→Android physical one-scan requirement or production/native-app/security phases.

| Verification | Actual result | Scope |
|---|---|---|
| Node tests | 48 passed, 0 failed | Real QR decoding/signatures, isolated PIN vaults, ledger/replay/insufficient funds, scanner lifecycle, audio/update rules, authenticated encrypted Nearby session and lost-ACK same-ID retry |
| Browser tests | 49 passed, 5 skipped, 0 failed/flaky | Desktop Chromium/WebKit, account/UI/scanner/camera simulations, offline cache/reopen, optical transfer matrix; 8 in-memory native bridge scenarios |
| Android | 10 passed, 0 failed | Android 11 emulator WebView/account/QR/virtual camera/payment/audio/update tests + shared frame codec tests; no physical BLE radio pair |
| Swift | 4 passed, 0 failed | CoreBluetooth library compiled on macOS CI; shared framing golden vectors, Unicode, bounds/gaps/expiry and account routing; no iPhone installation/radio |
| APK download | Public HTTP200; size/checksum/certificate report verified | Same package and signing certificate; emulator installed release. Actual user-phone update is unverified |
| APK contents | 23 bundled assets match tested source | Includes Nearby crypto/controller, existing PIN/QR/payment code and public QR fixtures |

[Browser + Swift run](https://github.com/usama-hussain-seo-spciealist/signal-app/actions/runs/45774886231) · [Android build/emulator run](https://github.com/usama-hussain-seo-spciealist/signal-app/actions/runs/45774886250) · [Release/checksum/signing reports](https://github.com/usama-hussain-seo-spciealist/signal-app/releases/tag/android-v3.3.0).

APK file `SignalPay-demo-3.3.0.apk`, 1,371,062 bytes. SHA256:

```
50eae17d72dfd3c5d3de74d1ccd602d5ea3234172916fe1a501c6cb3256a6977
```

Existing signing certificate SHA256:

```
7f3d505f4f162db9e850be43f07256360237a6c5690c2de3585b443862048be6
```

## What the Nearby browser simulation proves

Two separate browser contexts/accounts, Usama and Adil, run the real profile vault, QR decoder, signatures, ECDH/HKDF/AES-GCM channel, explicit amount/review/receiver acceptance, durable ledger and matching signed ACK checks. Only native radio events are routed in memory. Both directions, online/offline, execute in Chromium and WebKit (8 cases). Sender imports one account QR image; receiver imports **zero QR images**. Both histories have one matching TX-ID, sender PKR24,900 and receiver PKR25,100 after a PKR100 demo transfer. Two cases intentionally drop the first ACK, confirm sender Pending despite receiver credit, reconnect and resend the same saved transaction; no second credit/debit occurs. This also exercises a receiver notification arriving before the sender's connected callback, the timing bug fixed in this release.

These are **not physical Android↔iPhone BLE transfers**. WebKit on a desktop with a mock native bridge does not give Safari/PWA access to Bluetooth. Current iPhone PWA cannot participate in this native channel. Native iOS library is not a wallet host or IPA; integration, signing/install and physical tests remain outstanding.

## Existing optical regression proof

Four explicit cross-engine profiles (desktop WebKit/iPhone-style and Chromium/Android-style) transfer PKR100 in both directions online/offline, using real displayed account/payment/receipt PNGs and decoder signatures. Sixteen visible QR image captures are in the browser artifact. The captured account/receipt rasters were independently re-decoded and signatures checked after downloading the artifact. Matching receipt TX-IDs:

| Receiver profile | Mode | Matching signed receipt ID |
|---|---|---|
| Adil / Android-style | Online | `TX-e82669ee389e2e1627b2e92db03ec718` |
| Adil / Android-style | Offline | `TX-c0788afd440db2b3091765b5847417fd` |
| Usama / iPhone-style | Online | `TX-ec6256fcaebea08d7c7e777f89ea7555` |
| Usama / iPhone-style | Offline | `TX-b545938a80c96047c2394f7081999f3d` |

Skip reasons: four redundant matrix executions under the WebKit project (the Chromium project explicitly launches both engines for those four cases), and WebKit installed-PWA offline cold launch (not verified). Chromium browser offline close/reopen/PIN persistence is tested; it is not a physical iPhone cold-launch claim.

Public decoder-only fixtures: [simple SIGNALPAY-TEST-123 QR](https://usama-hussain-seo-spciealist.github.io/signal-app/test-qrs/simple.png), [signed Adil test account QR](https://usama-hussain-seo-spciealist.github.io/signal-app/test-qrs/account-receiver.png), [signed PKR100 test offer](https://usama-hussain-seo-spciealist.github.io/signal-app/test-qrs/account-payment-100.png). Test-account private keys were discarded. Simple text is readable data, not a valid payment; signed fixtures are not live funded/verified recipients. Use each logged-in account's actual personal QR for two-phone tests.

## Outstanding physical/security gates

No physical iPhone/Android Bluetooth pair, actual radio toggles, range/battery/interference, printed/screen camera scan, native iPhone install/background behavior, installed-PWA cold launch, native share destination or audible phone output was tested. [Two-phone test sheet and current iPhone blocker](DEVICE-TESTS.md).

No backend/OTP/global trusted identity, native Keychain/Keystore binding, device recovery/revocation, trusted offline-value issuer, cloud wallet reconciliation, real banking settlement or regulatory approval. Local malicious/cloned/restored state can defeat demo balance guarantees. No Soundbox hardware started. [Architecture and later-phase gates](MASTER-PLAN-STATUS.md).
