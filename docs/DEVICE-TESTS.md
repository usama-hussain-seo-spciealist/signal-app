# Two-phone acceptance sheet — not yet executed

Automated crypto/browser/native codec tests do **not** verify Bluetooth delivery between physical phones. No physical Android/iPhone, iPhone signing setup or TestFlight access is available to this run. All physical cases below are UNTESTED. Phase 1 iPhone→Android one-scan requirement is **not complete**.

## Your existing Android + iPhone today

1. Android: install the verified APK from [installation page](https://usama-hussain-seo-spciealist.github.io/signal-app/install.html). Update over the current app; do not uninstall/clear data. From v3.2+, Updates → Check for update → Update app opens the signed APK download; Android asks you to install it. There is no silent install/push update notification.
2. iPhone: keep the existing Safari/PWA, open online until v3.3.0 / Offline ready. No APK for iPhone. **This PWA still cannot use Bluetooth**. Do not expect a one-scan Bluetooth transfer between these two current installations. Preserve the signed multi-QR flow until a native iOS app exists.
3. Existing optical regression: Adil/Android Receive → Usama/iPhone scans personal account QR → independently checks full ID/name → PKR 100 → review/confirm → Pending. Adil scans payment QR, checks sender/amount and Accepts. Usama scans returned receipt. Check matching ID, Adil +100, Usama −100. Repeat in reverse and with Wi-Fi/mobile data off after preparing PWA online. This is demo credit, not bank settlement.

## Experimental native BLE test (two Android phones now; iPhone only after native host integration)

Prerequisite: both installations must expose the native BLE bridge. The Swift package is a library, **not an installable iPhone wallet**. Native iOS wallet host, matching bridge and security integration are still required. A Mac with Xcode, a configured signing team and the phone are needed for on-device installation; an Apple Personal Team may support own-device development without paid program enrollment. TestFlight distribution is a separate setup. Do not send credentials in chat. See [Apple signing guide](https://help.apple.com/xcode/mac/current/en.lproj/dev60b6fbbc7.html).

1. Use separate demo accounts Adil (receiver) and Usama (sender), record initial balances, account IDs and APK version. Keep PINs private. Existing Safari/PWA data is not automatically migrated into a future native iOS app.
2. Bluetooth ON on both, both apps foreground and unlocked. Turn Wi-Fi/mobile data OFF (Bluetooth must stay ON). Grant requested Bluetooth/Nearby permissions; older Android scans may require location permission/system Location. A denied prompt/power-off must show an error, never success. Retry Start Bluetooth after first permission grant if necessary.
3. Adil: Receive → Start Bluetooth receive. Wait for listening. Display personal QR.
4. Usama: Send/Scan → select Experimental Bluetooth → scan **Adil account QR once**. Check prefilled name/full ID independently, enter PKR 100, review Bluetooth mode and Confirm.
5. Adil should receive incoming review **without scanning another QR**. Independently confirm sender if unknown; verify amount, Accept. Persisted signed ACK should return automatically.
6. Verify same TX ID and amount, receiver +100, sender −100, each one history entry; sender Successful only after verified ACK. Inspect both receipts and save screenshots. A queued/connected status is insufficient evidence.
7. Repeat reversed roles, and repeat with internet ON. For native iOS later, run both directions explicitly; Android success cannot certify iOS.

| Physical case | Expected evidence | Status |
|---|---|---|
| iPhone Usama → Android Adil, PKR100, offline, one scan | Matching receipts, actual BLE delivery and signed ACK | BLOCKED: native iOS wallet not installed |
| Android Adil → iPhone Usama | Same, reverse BLE roles | BLOCKED: native iOS wallet not installed |
| Android → Android, online/offline | One scan, receiver review, matching signed ACK | UNTESTED: two physical devices unavailable |
| Disconnect before receiver accepts | Sender Pending/reserved, no receiver credit | UNTESTED |
| Disconnect after receiver accepts, before sender ACK | Receiver credited once, sender Pending; same-TX reconnect returns saved receipt | UNTESTED |
| Retry same transaction / replay receipt | No duplicate debit/credit/history or repeat success sound | UNTESTED |
| Wrong account / altered QR / insufficient funds | No new success/balance change | UNTESTED on hardware; automated coverage exists |
| Restart after Pending/receipt | PIN required, ID/history/receipt retained; reconnect same TX | UNTESTED on hardware; automated persistence coverage exists |
| 120s expiry/background/logout/Bluetooth off | Keys/session closed; Pending preserved; fresh authenticated retry | UNTESTED |
| Real iPhone installed-PWA offline cold launch, camera, speaker | Actual phone observation | UNTESTED |

Record model/OS/build, permissions, internet/Bluetooth settings, distances, timestamps, TX ID and screenshots for each run. Do not convert this sheet to PASS from browser simulation. Range, battery consumption, interference, background delivery, malicious-peer robustness and financial security require further device testing/audit. Do not start Soundbox hardware from this test build.
