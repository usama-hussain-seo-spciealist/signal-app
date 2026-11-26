console.log(`# SignalPay Demo for Android v${process.env.VERSION}

Default experimental foreground Bluetooth delivery for signed demo offers and receiver acknowledgements. Existing account/PIN/QR/history and optical recovery remain. Receiver opens Receive to start Bluetooth; sender keeps default Bluetooth and scans account QR once, checks recipient and confirms (test limit PKR 1,000). Receiver must review/accept. Sender stays Pending until the matching receiver-signed receipt is verified. Radio connection/write completion is never payment success.

Mutually authenticated ECDSA account keys, ephemeral P-256 ECDH, transcript-bound HKDF and directional AES-GCM; replay/order checks, bounded framing, foreground expiry and same-ID retry. Lost ACK leaves sender Pending; receiver returns its persisted receipt without crediting again. Custom experimental protocol is not independently audited, atomically settled funds or verified human identity.

New optional Bluetooth permissions: Nearby Devices on Android 12+; scan location permission on older Android capped at SDK30. No SMS, contacts or microphone permission. Android 8+. Same signing certificate/package; install over the current app, do not uninstall/clear data. Updates → Check for update requires internet and normal Android download/install confirmation. No push update notification or silent installation.

IMPORTANT: current iPhone Safari/PWA cannot use the native BLE channel. Repository now includes a native iOS bundled wallet, camera and CoreBluetooth host plus an unprovisioned arm64 iPhoneOS package. Signing/install and real iPhone→Android one-scan verification remain outstanding; no TestFlight build exists. Physical Android Bluetooth delivery/interoperability is also unverified. Browser bridge routing is explicitly simulated; emulator/Swift codec checks are not radio proof.

Local isolated PIN-encrypted demo profiles only; mobile ownership remains Unverified. No OTP, backend, recovery, cloud delivery/global sync, trusted monetary issuer or real banking settlement. Cloning/tampering with local balances is not prevented as a production financial system. QR fallback remains for current iPhone installations. Soundbox hardware has not started.

Encrypted account backup/restore preserves the same ID/QR/PIN/ledger/contacts/Pending state and refuses to overwrite an existing profile. Source data stays intact; use one active copy. Legacy Pending can retry BLE against its saved receiver key without a new TX ID. No trusted issuer prevents cloning/rollback. See docs/MIGRATION-v3.4.md and docs/IOS-SIGNING.md for preservation and no-Mac signing requirements.

See repository docs/NEARBY-PROTOCOL-v1.md, docs/DEVICE-TESTS.md and docs/MASTER-PLAN-STATUS.md for architecture, test instructions, blockers and later-phase gates. Automated crypto/QR, isolated browser flow simulations, Android emulator and Swift compilation/tests gate this APK release; physical camera, radio toggles, iPhone installed-PWA cold launch, range/battery and audible phone output remain unverified.

Source: ${process.env.GITHUB_SHA}
Build: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
`);
