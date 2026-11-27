# Native SignalPay on iPhone without buying a Mac

As of 27 November 2026. The published unsigned IPA is an **unprovisioned arm64 iPhoneOS signing package**, not a simulator binary, directly installable Safari download or signed TestFlight build. The user reported 3.4.0 AltStore installation followed by a `Missing bundled file` launch failure. Corrected 3.4.1 installation/launch and physical radio delivery remain unverified. Existing native users should follow the [in-place update instructions](IOS-LAUNCH-FIX-3.4.1.md), without deleting the app or restoring over an existing profile.

| Route | Mac purchase? | Account / cost | SignalPay status |
|---|---|---|---|
| Standard GitHub macOS runner: build + iOS Simulator | No | No Apple signing account needed; standard compute free for this public repo, artifact storage/retention limits still apply | Implemented |
| Windows + AltStore Classic own-device self-signing | No | Own Apple Account; free-account apps expire after 7 days and require refresh, documented 3-app limit | User reported 3.4.0 installed but launch failed; corrected 3.4.1 device launch UNVERIFIED |
| Official TestFlight via cloud signing | No local Mac | Apple Developer Program normally US$99/year, region-dependent; configured signing and App Store Connect | Not configured; no TestFlight link |
| Borrowed Mac + Xcode Personal Team | No purchase if available | Free personal Apple Account supports limited own-device development | Not available to user; not assumed |

Paid enrollment is not required for compilation or simulator tests. Official TestFlight distribution requires the paid program; testers do not need to buy membership. GitHub runners are temporary build machines, not remote USB access to your phone. No paid cloud service/enrollment was purchased.

Sources: [GitHub runner terms](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job), [Apple enrollment/fee](https://developer.apple.com/help/account/membership/program-enrollment/), [Apple free/paid features](https://developer.apple.com/programs/), [Personal Team](https://help.apple.com/xcode/mac/current/en.lproj/dev60b6fbbc7.html), [TestFlight](https://developer.apple.com/testflight/).

## Free Windows own-device path

1. Preserve the old app. **Updating an existing native installation:** use the same signing identity and install in place; no restore/reset is required. **First migration from a separate PWA/Android installation:** follow [encrypted migration](MIGRATION-v3.4.md) and restore before registering another native account.
2. Use [official AltStore Classic Windows instructions](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows), not AltStore PAL or an unknown signing/certificate site. You need Windows, iPhone/USB, compatible Apple device software and your own Apple Account. Follow the vendor's current requirements. Initial authentication/install/refresh need internet; the installed payment session should not.
3. Enter Apple authentication yourself in the signing software/Apple flow, never in this chat or GitHub source. This is third-party signing. No installer or signing account was configured automatically.
4. Download the verified corrected SignalPay unsigned IPA/checksum. In AltStore Classic, use My Apps → + to choose the IPA and sign/install with the same Apple Account as before. Enable Developer Mode if required by iOS and follow normal device trust/install prompts. Corrected 3.4.1 device launch remains UNVERIFIED until actually performed.
5. Keep the same signing Apple Account/team and resulting bundle ID for future updates. Do not uninstall, deactivate or clear data to fix signing. Export/verify a backup first; a changed identity/bundle ID may create another container.
6. Free-account apps expire after **7 days** and need refresh, with a **3-app** limit. This is not a permanent App Store install. [Expiry/app limits](https://faq.altstore.io/altstore-classic/your-altstore).

Compatibility with every Windows/iOS/Apple-account combination is not guaranteed. If signing fails, record versions and the exact error without credentials. Do not use borrowed enterprise certificates.

## Official TestFlight later, if chosen

Owner enrolls, accepts Apple's terms and configures app/bundle ID, signing/provisioning and App Store Connect permissions. A separately authorized cloud workflow can then sign/archive/upload using protected signing access. Owner payment/2FA/agreements require owner action; none is fabricated here. Encryption/export-compliance answers must be accurate. External TestFlight may need beta review. [Apple distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases), [TestFlight](https://developer.apple.com/testflight/).

Development, bundled offline files, Android signing with the repository's existing key, iPhoneOS compilation, simulator/browser/crypto/migration tests and unsigned-package publication can run without you. Physical signing/install, camera/Bluetooth permissions and real two-phone testing require your devices. Minimums iOS15+, Android8+. Confirm phone/iOS version and choose signing route when ready. No hardware Keychain/Keystore financial key, trusted issuer or real settlement is claimed.
