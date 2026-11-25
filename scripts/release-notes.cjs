console.log(`# SignalPay Demo for Android v${process.env.VERSION}

Automatic scanned receiver name/full Account ID with no retyping; unknown names explicitly unverified until independently checked. Bundled offline HTML audio chime with playback/restriction reporting. Additional payment/receipt scans are required optical delivery/acknowledgement, not duplicate account scans. Local name/mobile registration, PIN login, separate encrypted profiles, personal QR codes, masked recipient review, Sent/Received receipts and PKR demo balances. Mobile numbers stay Unverified: no OTP, central account directory, shared login or cloud backend is configured. No real funds, banking settlement, identity certification or SMS service.

PIN-derived AES-256-GCM vaults use PBKDF2-HMAC-SHA256 (600,000 iterations); session keys/PINs are not persisted. Restart requires PIN. Logout clears private UI and locks same-account tabs; old unnamed v2 data is preserved separately and not silently assigned to a new registration. Clearing app data or losing the PIN can lose access; no recovery service exists.

QR names are resolved against local signed registration records or independently checked saved recipient records. An unknown cross-device account requires explicit contact confirmation, not blind trust in its QR label. Personal identity/phone ownership remains unverified.

Offline delivery: receiver account QR → sender review/Confirm & Send creates Pending/reserved payment QR → receiver accepts/rejects and returns signed acknowledgement → sender verifies matching receipt to finalize balance/status. Both histories share the transaction ID. Duplicate scans/imports do not apply twice. Receiver credit occurs before sender receipt return; this is not atomic financial settlement.

Reconnect retries the logged-in account's imported signed receipt inbox only. Receipt bundles can be shared/imported. There is no automatic cloud delivery/sync, Bluetooth transport or trusted global ledger; local state can be tampered with or cloned. Online Payment also uses manual QR exchange. First prepare the PWA online; APK files are bundled. Android 8.0+.

Build gates include real crypto/QR tests, Adil/Usama browser-profile PKR 100 transfer tests in both directions online/offline, registration/login/isolation/persistence, reconnect idempotency and seven Android emulator checks. Physical phone cameras, radio toggles, iPhone installed-PWA cold launch, sharing destinations and audible speaker output remain unverified.

Source: ${process.env.GITHUB_SHA}
Build: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
`);
