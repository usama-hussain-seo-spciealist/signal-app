# Master plan delivery ledger

This extends the existing repository and preserves account QR/PIN/history/optical payment recovery. No new repository or production banking service. Work is prioritized according to the supplied master specification.

| Phase | Implemented / design | Open acceptance gate |
|---|---|---|
| 1: remove extra QR | Android experimental native GATT adapter + encrypted shared session; signed offer/ACK reuse, opt-in UI, safe Pending/retry; original QR fallback | Actual iPhone→Android one-scan is **blocked** by missing native iOS host/install, and physical BLE tests are unverified |
| 2: communication | [Versioned protocol](NEARBY-PROTOCOL-v1.md): account-fingerprint discovery, mutual signing-key authentication, ephemeral ECDH/HKDF/GCM, ordered frames, bounded foreground sessions, receipt retry/idempotency | Independent protocol/security review, real interoperability/background behavior |
| 3: native apps | Existing Android WebView wallet with native camera/share/sound/update/BLE bridges; Swift CoreBluetooth transport library and shared framing tests | Production native UI, iOS wallet host/signing/TestFlight, device authentication, OS secure-key integration; library is not an iOS app |
| 4: accounts/security | Local isolated PIN-encrypted profiles, stable signed IDs, consent/review, signed offers/receipts, replay checks, reservations, bounded demo history, experimental BLE limit | OTP/backend/trusted global identity, recovery/device management, Keychain/Keystore binding, independent audits, issuer-led offline value, double-spend/conflict resolution, fraud monitoring |
| 5: UX | Existing mobile dashboard, send/receive, amount/review/receipts/status, Updates; explicit native-BLE controls/capability and Pending messages | Native product polish/accessibility/device review; no Settled label for this demo |
| 6: testing | Automated real crypto/QR, browser profile simulations, native emulator/codec and Swift build checks; reports separate automation from hardware | [Physical acceptance sheet](DEVICE-TESTS.md), real radio/camera/speaker/range/battery/interruptions/security audit |
| 7: Soundbox | Future design only: bind merchant key/account to provisioned BLE service; reuse signed ACK protocol after appropriate value validation | No hardware/firmware started. Prototype only after phone protocol/device gates; measure range/interference/wrong-merchant routing, battery/charging, protected firmware/keys |
| 8: delivery | Existing GitHub Pages + signed Android release, gated verification, installation instructions, source/test reports | Final physical acceptance and production scope are outstanding |

## Production financial architecture decisions still required

Local demo balances are not authoritative funds. A production issuer/partner must define offline spendable value, signed issuance and spending budgets, revocation, device trust/anti-rollback, recipient exposure limits, immutable audit trail, reconciliation, conflicts and loss/chargeback policy. Receiver acceptance before sender ACK is not atomic settlement. Reconnect currently reconciles imported local receipts only, not a server/global ledger. Two cloned malicious wallets can break local demo balance guarantees.

No phone OTP provider/backend is configured. Phone numbers/names remain unverified; key authentication is not legal identity. Recovery and lost-device revocation need a trusted service. Native secure storage and device authentication must be designed and tested before production; current PIN-derived vault is not a claim of hardware-backed protection.

Before any real-money Pakistan launch, determine the licensed/authorized issuer and banking/payment partner, review applicable SBP licensing/EMI/payment-system frameworks with qualified local advisers, and implement required KYC/AML, safeguarding, fraud/risk controls, consumer protection, security assessments and regulatory reporting as applicable. Nothing here is regulatory approval or a legal/compliance certification. Current references: [SBP BPRD Circular 03/2026 licensing handbook](https://www.sbp.org.pk/circulars/bprd-circular-no-03-of-2026), [SBP PSO/PSD Circular 03/2023 EMI regulations](https://www.sbp.org.pk/circulars/pspod-circular-no-03-of-2023), [SBP payment ecosystem](https://www.sbp.org.pk/our-operations/payments-ecosystem-and-infrastructure/emis-and-pso-psps).
