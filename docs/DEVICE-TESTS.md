# Native iPhone ↔ Android acceptance — milestone OPEN

No physical phone pair is available to this development environment. Every physical scenario below is **UNVERIFIED**. Simulator, desktop browser and in-memory bridge tests are separate. An installed app, scanned QR, connected radio or queued write does not establish payment receipt.

## Prepare your two phones

1. Install verified Android v3.4 over existing app. Native iOS v3.4 must be signed/installed: [no-Mac signing](IOS-SIGNING.md). Safari downloading an unsigned IPA will not install it. PWA still lacks native BLE.
2. [Migrate existing iPhone account](MIGRATION-v3.4.md) before registering another native profile. Keep source intact; use one active copy. Adil/Android and Usama/iPhone must have different IDs.
3. Record device models/OS/app builds, initial balances/reservations. Unlock both, Bluetooth ON, SignalPay foreground. Allow camera/Bluetooth/Nearby permission; older Android scan may require Location permission/system Location, not GPS collection. If first prompt interrupts Receive, reopen Receive/restart Bluetooth after granting it.
4. Fully offline: airplane mode/no cellular service, Wi-Fi OFF, Bluetooth ON on both. Verify settings. Initial signing/install/refresh needs internet; payment session must not. iOS loopback asset server is inside that phone and requires neither Wi-Fi nor cellular.

## iPhone Usama → Android Adil, PKR100

1. Adil opens **Receive Money**: native Bluetooth starts automatically. Wait for listening, display personal QR. Keep app open; receive/session expires after two minutes, restart if needed.
2. Usama opens **Send Money**, keeps default Bluetooth, scans Adil's account QR **once** using native camera. Only sender scans.
3. Independently compare prefilled name/full ID with Adil, enter **100**, Review, Confirm. QR/key signatures are not verified human identity/funds.
4. Adil gets incoming review automatically over BLE, checks sender/amount and Accepts. Adil must not scan Usama's QR. Unknown sender requires independent contact confirmation.
5. Signed ACK returns automatically. Check both histories/receipts: same TX ID/amount/parties, sender −100 and receiver +100 relative to recorded baseline, one entry each. Sender Successful only after receipt verification. Save both screenshots and radio settings.
6. Repeat **Android Adil → iPhone Usama**, then repeat internet ON. Use balance deltas for sequential tests; do not reset accounts. Test two native apps, not native plus PWA. Speaker output is a separate observation, not settlement evidence.

| Physical case | Required outcome | Actual result |
|---|---|---|
| iPhone→Android PKR100 fully offline, sender-only scan | Receiver review without camera, matching verified ACK/IDs, one debit/credit | UNVERIFIED |
| Android→iPhone PKR100 fully offline | Same with reversed BLE roles | UNVERIFIED |
| Both directions internet ON | Same BLE workflow, no server/bank implied | UNVERIFIED |
| Invalid/tampered QR or wrong receiver advertising | Reject before success/balance change | UNVERIFIED |
| Invalid amount/insufficient available funds | No new offer/overdraft | UNVERIFIED |
| Disconnect before receiver acceptance | Sender Pending/reserved, no accepted receiver credit | UNVERIFIED |
| Disconnect after acceptance before ACK | Receiver decision persists; sender Pending. Restart Receive and retry saved TX to return persisted ACK once | UNVERIFIED |
| Duplicate delivery/receipt/rapid Confirm | One credit/debit/history entry, same-ID retry | UNVERIFIED |
| Old optical Pending via Bluetooth retry | Saved receiver key checked, same TX ID, no new payment or receiver scan | UNVERIFIED |
| Background/lock/Bluetooth OFF/expiry | Session/keys close, Pending retained; PIN/fresh connection needed | UNVERIFIED |
| Update/restart/encrypted migration | Same account/QR/history/Pending; wrong PIN/conflict never overwrites | UNVERIFIED on hardware |

Receiver local acceptance can precede sender receipt verification: receiver may have demo credit while sender stays Pending. This is not atomic settlement. Never cancel a reservation unilaterally or create a second payment to fix it. Retry the saved transaction; QR/receipt import stays recovery. Connection failure alone is not a signed rejection.

Record actual model/OS/build, permissions/radio settings, distance/time, TX IDs and screenshots. Automated crypto/QR, browser bridge simulations, Android emulator, Swift framing and iOS Simulator/WKWebView do not certify physical radios, cameras/speakers, airplane mode, range/battery/interference, signing-tool upgrades or installed-PWA cold launch. No hardware-bound financial keys, OTP/backend/recovery, trusted global ledger/reconciliation or real settlement. No Soundbox hardware started.
