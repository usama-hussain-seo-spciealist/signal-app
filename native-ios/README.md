# Native iOS transport foundation

Swift package, iOS 15+/macOS 12+. `swift test --package-path native-ios` compiles the CoreBluetooth adapter and tests the Android-compatible frame golden vectors, UTF-8, bounds, gaps/expiry and account routing on macOS CI. It does not open a radio connection or install an iPhone app.

**This is not an iOS wallet application or IPA.** Missing: native wallet host and origin-restricted WebView bridge (or a native implementation of the same signed/AEAD protocol), camera/account UI integration, Keychain/device-bound signing keys, authentication, signed install, migration/recovery design and physical testing. Existing Safari PWA does not load this Swift library. Do not tell users it updates iPhone Bluetooth support.

Host should create `CoreBluetoothTransport` on explicit user action, configure `NSBluetoothAlwaysUsageDescription`, check power/authorization and retry after the first authorization/state callback. Route opaque messages through the shared Nearby v1 authenticated protocol; never let GATT events directly credit a wallet. Stop on background/logout/disconnect, retain durable signed receipts, and create fresh keys on retry. Native camera use needs its own purpose string/permissions. No background modes are enabled/claimed by this library. [Protocol](../docs/NEARBY-PROTOCOL-v1.md), [device test prerequisites](../docs/DEVICE-TESTS.md).
