# SignalPay native iOS test app

`SignalPay.xcodeproj` integrates the existing CoreBluetooth source with UIKit/WKWebView, bundled wallet, AVFoundation camera, sharing and lifecycle PIN/privacy locks. Same signed offers/receipts/Nearby crypto modules as Android. iOS15+. No remote wallet code; intended foreground BLE exchange needs no internet/cellular. Physical iPhone↔Android delivery is UNVERIFIED.

```
node scripts/package-ios.cjs
xcodebuild -project native-ios/SignalPay.xcodeproj -scheme SignalPay -sdk iphoneos -configuration Release CODE_SIGNING_ALLOWED=NO build
```

Use `Native iOS test app` GitHub workflow without a Mac. It compiles shared framing, runs iOS Simulator wallet/crypto/migration/lifecycle tests and builds an unprovisioned arm64 iPhoneOS IPA. **Signing package, not a directly installable download.** [No-Mac options/costs/actions](../docs/IOS-SIGNING.md).

Production uses persistent `WKWebsiteDataStore.default()` and stable loopback origin. A Network-framework read-only server binds IPv4 loopback only, serves bundled static assets and never exposes a wallet/database API. This is internal to one phone, not Wi-Fi/LAN communication. Main-frame/exact-origin bridge guards, navigation restrictions and CSP block remote code/frames/connections. Native AVFoundation camera, no web microphone. Background stops BLE/camera/speech, locks PIN vault and masks app-switcher UI. CoreBluetooth permission/power initialization waits for callbacks and ignores stopped managers. No background delivery guarantee.

Existing PIN-derived WebCrypto storage is retained, not native Keychain/Secure-Enclave binding or production bank security. Safari data is not silently moved: [encrypted add-only migration](../docs/MIGRATION-v3.4.md) retains ID/key/history and source data. Use one active demo copy; no trusted issuer prevents cloning/rollback. [Protocol](../docs/NEARBY-PROTOCOL-v1.md), [physical acceptance](../docs/DEVICE-TESTS.md). No Soundbox hardware, OTP/backend or real settlement.
