# SignalPay Nearby v1 — experimental demo transport

Status: foreground Android GATT adapter integrated with the existing wallet; native iOS CoreBluetooth integrated into a bundled UIKit/WKWebView test app; signing/physical install still required. Physical interoperability is unverified. Native apps default to foreground BLE; PWA uses optical recovery. No real funds, trusted monetary issuer, phone verification or banking connectivity.

## What the old extra scans do

An account QR identifies a public signing key; it contains no payment. After explicit confirmation the sender persists a signed v2 offer as Pending and reserves demo funds. Scanning that new QR delivers the offer to the receiver. The receiver explicitly accepts/rejects, persists the decision and a signed receipt, and credits once on acceptance. Scanning the receipt returns that acknowledgement to the sender. Only a matching receiver-signed receipt finalizes debit/Success or rejection/Failed. These extra scans are the old delivery and return channel, not redundant identity scans.

Nearby replaces offer/receipt carriage with encrypted foreground BLE, retaining those same ledger checks and explicit receiver review. It never changes Pending because a radio connects or a GATT write completes. The receiver opens Receive to start Bluetooth automatically and displays their existing account QR; sender scans once using the default Bluetooth option before confirmation. Receiver review/Accept is still required; receiver does not scan a second QR in this transport.

## Platforms

| Pair | Foundation | Current deployable status |
|---|---|---|
| Android ↔ Android | Native GATT central/peripheral, bundled wallet | Experimental APK; physical delivery not verified |
| Android ↔ native iOS | Matching CoreBluetooth central/peripheral library | Native host implemented; needs signing/install and two-phone tests |
| Native iOS ↔ native iOS | Same library/protocol design | Native host implemented; signing/install and physical tests outstanding |
| iPhone Safari/PWA ↔ any BLE device | No native bridge in this app | Unsupported; existing optical QR fallback only |

Web Bluetooth is not a usable bridge for the installed iPhone Safari/PWA. Native iOS code is required. Do not promise web updates can add CoreBluetooth to Safari. Foreground only: keep Bluetooth on and both apps open; Wi-Fi/mobile data may be off. There is no universal background delivery, pairing guarantee, NFC, local-network or cloud transport.

## Discovery and authenticated session

Receiver service UUID maps its `SP-` 32-hex public-key fingerprint to `8-4-4-4-12` UUID grouping. It is public routing data, not a secret or identity proof. An attacker may advertise the same UUID: sender must authenticate the account signing key against the scanned account QR. A relay/denial of service cannot be excluded; this is not distance bounding.

GATT write UUID `6f8d0001-8d9a-4d21-a8b7-9d7f70000001`; notify UUID `6f8d0002-8d9a-4d21-a8b7-9d7f70000001`; CCCD `2902`. Sender is central/write client, receiver peripheral/notification server. Only one peer per session. Android requests Nearby Devices runtime access on Android 12+; older scan permission is fine location (capped at Android 11). BLE support/advertising/power/permissions can fail visibly.

1. Receiver generates ephemeral P-256 ECDH key, random 128-bit `sid` and nonce. Signs exact UTF-8 JSON bytes `{v:1,t:'receiver',sid,qr,ephemeral,nonce}` with existing ECDSA-P256/SHA256 account key. Wire: `spn1:<base64url(JSON)>.<base64url(raw64-signature)>`.
2. Sender verifies v2 signed account card, account ID/public key and hello signature against scanned receiver; rejects self-payment. Generates own ephemeral key/nonce, signs `{v:1,t:'sender',sid,helloHash,qr,ephemeral,nonce}`. `helloHash` is SHA256 of exact receiver wire string.
3. Receiver verifies sender card/signature, session ID, hello hash and single-use handshake. Sender human identity/funds remain unverified; local independent contact confirmation still applies.
4. ECDH 256-bit secret → HKDF-SHA256; salt SHA256(`receiverWire + '|' + senderWire`), info UTF-8 `SignalPay Nearby v1|<sid>|<direction>`. Two independent AES-256-GCM keys for `s2r`/`r2s`; ephemeral private keys/session AES keys nonexportable in WebCrypto and never persisted. This is an experimental custom protocol, not an independent security audit or production certification.
5. Encrypted envelope exact fields `{v:1,t:'box',sid,seq,c}`; `c` is base64url ciphertext+128-bit GCM tag. Per-direction counter starts 1, maximum 1,000,000; 12-byte IV is eight zeros followed by big-endian uint32 sequence. AAD `spn1|<sid>|<direction>|<seq>`. Reject wrong session, replay, gaps, tampering and invalid UTF-8. Outgoing controller serializes encryption/posting. Plaintext limit 3,000 UTF-8 bytes, native assembled message limit 8,192 bytes.
6. Local session deadline 120 seconds; stop on background/logout/disconnect/error. Reconnect creates fresh keys and retries the **same saved transaction ID**, never a new payment. Native packet ACKs are not wallet ACKs. No transaction success is implied by channel readiness.

## GATT framing (Android/Swift shared golden vectors)

Each characteristic value: byte `53`, version `01`, message ID uint16 BE, byte offset uint16 BE, total UTF-8 length uint16 BE, then nonempty payload. Header 8 bytes. IDs 1–65535, total 1–8192, characteristic value 20–512 bytes. Implementations cap negotiated payload values at 182 bytes but support default MTU 23 (20-byte value). Strict sequential assembly; only byte-identical already-received partial chunks are ignored; conflicts/gaps fail. Incomplete assembly expires after 10 seconds inactivity or 30 seconds total. Session/output queues bounded. No frame hash replaces authenticated encryption/signatures.

Golden `Hello SignalPay`, message 7, value length 20:

```
530100070000000f48656c6c6f205369676e616c
53010007000c000f506179
```

## Ledger, interruption and limits

Signed v2 offers and receipts are unchanged. Sender saves Pending before radio delivery; receiver saves signed decision before sending ACK. Receiver credit and sender debit are not atomic. If receiver has credited but ACK is lost, sender stays Pending/reserved. Reconnect/resend same signed offer: receiver checks original offer hash and returns its **persisted receipt**, without another credit or forced re-approval. Sender checks accounts, transaction ID, amount, currency, mode, offer hash, decision and receiver key before applying once. Conflicting duplicate IDs/decisions fail. Pending cannot be unilaterally canceled because receiver might already have accepted. Saved optical QR remains recovery path.

Experimental Nearby demo amount limit PKR 1,000, enforced on both receive and send. Existing general demo limit PKR 100,000 and history 500 apply. PIN vault, idempotent signed history and insufficient-funds reservations remain. Internet reconnect only reconciles already imported signed receipts in that account; there is no global server, automatic offer relay, authoritative wallet reconciliation, phone OTP, recovery or trusted funds proof.

Cloned/restored/tampered local state can double-spend demo balances. Device-bound Keystore/Keychain, issuer-signed offline value, spending budgets, trusted counters, revocation/conflict resolution, risk controls and independent audit are future work. Encryption and signatures alone cannot make a local balance real money.

Platform references: [Android permissions](https://developer.android.com/develop/connectivity/bluetooth/bt-permissions), [Android GATT](https://developer.android.com/develop/connectivity/bluetooth/ble/transfer-ble-data), [CoreBluetooth](https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager), [iOS background constraints](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html), [WebKit Web Bluetooth issue](https://bugs.webkit.org/show_bug.cgi?id=238049).

Native iOS v3.4 bundles the same protocol in a stable loopback WKWebView, uses AVFoundation camera, stops/locks on background, and supports encrypted add-only profile migration. No Keychain device binding or trusted financial value is implied. Legacy Pending retry may use the saved audited peer ID/key instead of a retained account card: the fresh signed hello must match both, then its verified account card is persisted before sending the original offer. No new TX ID is created. [Migration](MIGRATION-v3.4.md).
