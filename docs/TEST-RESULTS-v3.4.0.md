# SignalPay v3.4.0 — software delivery verified, physical milestone OPEN

26 November 2026. Tested source/tag: `4844229c2e402d154e2c966a3664b23a9ccf2ff4`, `android-v3.4.0` and `ios-v3.4.0`. Changes are in the existing repository. **No physical Android↔iPhone single-scan transfer has been verified. This milestone is not complete.**

## Builds/downloads

| Deliverable | Verified result | Limit |
|---|---|---|
| [Android APK](https://github.com/usama-hussain-seo-spciealist/signal-app/releases/download/android-v3.4.0/SignalPay-demo-3.4.0.apk) | Public HTTP200, 1,378,026 bytes, size/SHA256/asset digest and original signing certificate match; installed in emulator | Physical phone install/upgrade/radio behavior unverified |
| [iOS signing package](https://github.com/usama-hussain-seo-spciealist/signal-app/releases/download/ios-v3.4.0/SignalPay-demo-ios-3.4.0-unsigned.ipa) | Public HTTP200, 420,751 bytes, checksum/asset digest match; arm64 **iPhoneOS**, correct bundle/version/purpose strings, no embedded provisioning profile | **UNPROVISIONED. Apple signing required. Not a directly installable IPA or TestFlight link.** |
| Shared assets | 27 APK assets and 23 IPA wallet/crypto/camera/migration assets match tested source | No remote wallet code |

Android SHA256: `05675e478ce734baa6edfae136bea9657ea617c695d1880a173917efe38f36bf`

iOS unsigned IPA SHA256: `26681b018f7310e2cd1cecb890fcdd32e4e28c3bf7112b4d5f6ca34f1b4d133d`

Android retains certificate SHA256 `7f3d505f4f162db9e850be43f07256360237a6c5690c2de3585b443862048be6`, package/origin and profile database. Native iOS bundle ID is `com.signalpay.demo.ios` and internal loopback origin stays fixed across in-place updates. Existing data is not erased. [Migration plan](MIGRATION-v3.4.md).

## Actual automated results

| Runner/platform | Passed | Failed | Skipped / scope |
|---|---:|---:|---|
| Node logic/crypto/QR | 54 | 0 | Real QR decode/signatures, vault encryption, limits/invalid data, replay, sessions, legacy retry, encrypted migration and camera/update adapter rules |
| Chromium + desktop WebKit | 51 | 0 | 5 skipped; includes 8 **in-memory native bridge simulations**, 4 explicit cross-engine optical transfer cases, migration UI and account persistence |
| Android11 emulator | 12 | 0 | WebView/PIN/QR/virtual camera/sound/update, native bridge capability/default, backup non-overwrite and shared Java frame codec; no physical radio pair |
| iOS Simulator / actual WKWebView | 6 | 0 | Native bundled app/secure loopback+bridge; PIN/QR after WebView recreation; encrypted profile/Pending restore/non-overwrite; real iOS WebCrypto signed/encrypted transfer/idempotency; lifecycle PIN lock/background bridge rejection; origin/path guards |
| Swift/CoreBluetooth source + frame tests on macOS | 4 | 0 | Shared Android/Swift frame golden vectors, Unicode/bounds/gaps/expiry/routing. Library compilation is not a radio test |

[Android workflow](https://github.com/usama-hussain-seo-spciealist/signal-app/actions/runs/45785000884) · [iOS device/simulator workflow](https://github.com/usama-hussain-seo-spciealist/signal-app/actions/runs/45785001179) · [Browser + Swift workflow](https://github.com/usama-hussain-seo-spciealist/signal-app/actions/runs/45785001263).

Five browser skips: four redundant matrix executions in the WebKit project because the Chromium project explicitly launches both engines for those four cases; one WebKit installed-PWA cold-launch case remains unverified. Chromium browser cold reopen/PIN persistence is tested. Native iOS persistence test recreates WebViews sharing a test data store in the same process; it does not prove physical app cold launch or signer/tool upgrade behavior. Native lifecycle test invokes production controller lifecycle methods; real OS suspension/radio behavior still requires phones.

## Single-scan change and proof boundary

Native Receive automatically starts a foreground BLE service tied to the account fingerprint. Sender scans only the signed account QR; prefilled name/full ID still need independent contact confirmation. Native iOS AVFoundation supplies the camera result; Android retains its camera/decoder. Both platforms ship the same v2 signed-offer/receipt and Nearby v1 session code.

Native adapters carry a mutually signing-key-authenticated ephemeral ECDH/HKDF/AES-GCM session. Sender persists Pending/reservation before delivery. Receiver gets the signed offer over BLE without scanning, reviews/accepts and persists a signed acknowledgement. ACK returns over BLE; sender checks receiver key, both IDs, amount/mode/offer hash/decision before Success/debit. A radio connection or write callback never finalizes payment. Unknown names/phone ownership are not centrally verified.

In 8 desktop browser simulations, Usama↔Adil, both directions and internet ON/OFF execute the real wallet/UI/crypto; only native radio events are routed in memory. Sender imports one account QR, receiver imports zero. Matching TX IDs, one entry each, sender PKR24,900 and receiver PKR25,100 after PKR100. Two cases drop the first ACK and retry the same TX without double credit. Two cases convert an older optical Pending offer to BLE using its audited saved receiver key and the fresh signed hello; the original TX ID is reused. These are **not physical Bluetooth transfers**.

Receiver can have local demo credit before sender gets the ACK; sender stays Pending/reserved. This is not atomic settlement. Background closes native channels and locks iOS PIN UI; no universal background delivery. BLE demo cap PKR1,000; original QR/receipt import stays recovery.

## Data preservation evidence

Add-only encrypted backup/import preserves ID/private-key relationship, personal QR, original PIN, retained ledger/receipts, contacts, Pending reservations and receipt inbox. Browser UI tests restore received-credit/signed-receipt history plus an outgoing Pending offer/contact, compare the source unchanged, reject wrong PIN and duplicate import, then log back into an unrelated destination account with its original data intact. iOS Simulator independently checks encrypted Pending restore. Android emulator verifies export privacy and that import cannot replace its saved profile. No source data is deleted. Use one active copy; malicious/cloned/restored balances are not trusted financial value.

## Real-device acceptance and user actions

All physical cases are **UNVERIFIED**: iPhone→Android PKR100; Android→iPhone PKR100; airplane/no cellular + Wi-Fi OFF + Bluetooth ON; sender-only scan; matching receipts/IDs; invalid/duplicate/interrupted transfers; missing-ACK Pending; real cameras/speakers; background/range/battery/interference; installed-PWA/full native cold launch; physical in-place update/migration. This Windows environment exposed no attached iPhone/Android/ADB test device.

[Exact two-phone test sheet](DEVICE-TESTS.md). User must choose/perform iPhone signing/install, grant phone permissions and supply actual phone observations. [No-Mac signing/costs/actions](IOS-SIGNING.md): cloud compilation/simulator compute in this public repo is free; Windows AltStore Classic is a third-party free-account own-device option with refresh/expiry limits and **unverified SignalPay installation**. Official TestFlight normally needs paid Apple Developer Program/signing/App Store Connect. No Apple credentials, paid enrollment, installer or TestFlight upload were configured here.

Current signing/auth storage is a local PIN-encrypted demo, not hardware Keychain/Keystore financial key binding, OTP/global identity/recovery, trusted offline-value issuer or cloud reconciliation. Custom protocol has not had independent security certification. No real funds, banking settlement or Soundbox hardware development.

## Optical regression raster proof

Sixteen captured QR/UI PNGs remain in the browser artifact. Account and receipt rasters were independently re-decoded and signatures checked after downloading the artifact:

| Receiver profile | Mode | Matching receipt TX ID |
|---|---|---|
| Adil / android-receiver | online | `TX-77ef13e2353a2cf5eff4a2ee32f77bd2` |
| Adil / android-receiver | offline | `TX-6887e8489b8ea256f78743c7c860cd5e` |
| Usama / iphone-receiver | online | `TX-22b41a1a4bf29b1bf798445057347958` |
| Usama / iphone-receiver | offline | `TX-c089b8aafe4a48e35b2f55b6f4690356` |

[Simple decoder-only QR](https://usama-hussain-seo-spciealist.github.io/signal-app/test-qrs/simple.png) · [Signed Adil test account QR](https://usama-hussain-seo-spciealist.github.io/signal-app/test-qrs/account-receiver.png). Test-only fixtures, keys discarded, not real funded/verified accounts. Use the real logged-in personal QR for phone tests.
