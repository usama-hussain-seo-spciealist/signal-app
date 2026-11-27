# iOS 3.4.1 bundled-file launch fix

This is an iOS-only Release wrapper patch (build 341) for the user-reported 3.4.0 real-iPhone launch failure. Physical launch of the corrected build and iPhone ↔ Android Bluetooth remain **OPEN / UNVERIFIED**. See the release's attached package-verification JSON and linked Actions run for build results.

## Investigation

The public 3.4.0 unsigned IPA is 420,751 bytes (about 411 KiB), SHA-256 `26681b018f7310e2cd1cecb890fcdd32e4e28c3bf7112b4d5f6ca34f1b4d133d`. Its `Payload/SignalPay.app/www/index.html` exists (22,281 bytes), together with 39 other web files. It contains a compiled native executable; no development server is needed. Small compressed size did not establish missing resources.

The exact `Missing bundled file` response originated from `BundleServer.response`. The original guard compared a standardized candidate URL against an unstandardized bundle root using a string prefix. Darwin can remove `/private` during standardization when the equivalent file exists. The prefix check could therefore reject a real file. Apple's [path standardization documentation](https://developer.apple.com/documentation/foundation/nsstring/standardizingpath) describes this behavior. A cloud Darwin regression test prints `PATH_PROBE` with the legacy decision and file-existence result; the physical failing phone's sandbox path has not been captured.

Both root and candidate are now resolved/standardized before comparing path components. Absolute paths, traversal, backslashes and symlinks escaping the root remain blocked. All wallet resources receive a generated SHA-256 manifest; startup validates the package before opening WebKit. Missing/corrupt files now produce an actionable alert rather than an unexplained blank screen.

## Verification gates

- Swift tests cover `/private/tmp` alias resolution, trailing separators, inside/outside symlinks, traversal, missing/changed resources and existing Bluetooth framing.
- Python packaging tests accept a complete extracted IPA fixture and reject missing HTML, changed JavaScript, missing manifest and ZIP traversal.
- A newly created disposable iPhone Simulator runs optimized Release hosted wallet/lifecycle tests and black-box app launch/relaunch UI tests. Login-screen screenshots are exported from the actual Xcode test result.
- Simulator `.app`, arm64 iPhoneOS `.app` and the extracted final IPA must each pass manifest, required-file, local HTML/icon-reference, permission and source-byte checks.
- Shared Node/Chromium/WebKit tests must pass before publishing. None of these tests is a physical Bluetooth/radio test.

## Data compatibility

No account migration/reset is required. The shared wallet remains 3.4.0; its bundled files are compared byte-for-byte with source. Bundle ID `com.signalpay.demo.ios`, WebKit persistent store and origin `http://127.0.0.1:18743/signal-app/index.html` are unchanged. Account/PIN encryption, QR format, balances, signed history and Bluetooth protocol are unchanged. Android APK and the separately installed iPhone PWA are unaffected. Keeping the same effective signed app identity is essential for in-place data preservation; physical update preservation still needs device verification.

## Windows + AltStore Classic update

1. Keep the existing native SignalPay installed. Do not delete/deactivate it or clear its data. Keep the separately installed old demo/PWA too. Export an encrypted backup if the existing wallet is accessible.
2. Run your already configured AltServer on Windows. Connect the trusted, unlocked iPhone by USB (or the supported same-network connection). Keep Developer Mode enabled.
3. Download the **3.4.1 unsigned IPA** from this repository's `ios-v3.4.1` release to Files on the iPhone.
4. In AltStore Classic, open **My Apps → +** and choose that IPA. Use the **same Apple Account/signing identity** as the installed native SignalPay. Allow it to update the existing app. If offered removal or a separate copy instead, stop and check the identity; do not delete the original.
5. Open SignalPay. The expected initial screen is the existing wallet login (or existing profile state), not `Missing bundled file`. The native version is 3.4.1/build 341; wallet UI may still show 3.4.0 because wallet code is unchanged. Check the existing Account ID/QR/history before further payment tests.
6. If launch still fails, record iPhone model/iOS version, exact visible error and whether AltStore replaced the original app. No corrected real-device launch has yet been claimed. Refresh free-account signing before expiry through your existing AltStore setup.

Official AltStore references: [My Apps and sideloading](https://faq.altstore.io/altstore-classic/your-altstore), [Windows setup](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows), [AltServer connectivity](https://faq.altstore.io/altstore-classic/altserver).

This remains a local demo, not production banking or a production security certification. Real funds, banking connectivity and Soundbox hardware are outside this fix.
