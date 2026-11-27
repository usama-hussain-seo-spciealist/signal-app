console.log(`# SignalPay iOS ${process.env.IOS_VERSION || '3.4.1'} — bundled-file launch fix

Fixes an inconsistent bundle-path containment check: root and requested asset are now both canonicalized before comparing path components. The original check could reject an existing asset when Darwin standardizes a /private path alias. Resources were present in the 3.4.0 IPA; this is not a remote-development-server dependency.

Adds a complete bundled-asset SHA-256 manifest, startup validation, actionable missing-resource errors, Darwin alias/traversal regression tests, clean Release iOS Simulator launch/relaunch UI tests with screenshots, and verification of every asset in the final extracted IPA. GitHub Actions must pass before publication. See the attached JSON reports and build logs for exact results.

iOS-only native wrapper patch: 3.4.1/build 341. Existing web wallet remains 3.4.0. Bundle identifier com.signalpay.demo.ios, persistent WebKit store, loopback origin, account/PIN/QR/history format, camera and Bluetooth protocol stay unchanged. Android 3.4.0 is unaffected. No data reset/migration is required for an in-place update under the same signing identity.

Windows + AltStore Classic: keep the existing native app installed. Download this corrected unsigned IPA and use AltStore My Apps → + with the SAME Apple Account/signing identity used previously. Install as an update to SignalPay; do not delete/deactivate the old app or change its identifier. If AltStore proposes a separate copy or removal, stop and check the signing identity first. The separately installed PWA is untouched. Back up an accessible wallet before updates where possible. Free-account signing expires and needs refresh; credentials stay with your signing tool, not this repository.

This is an optimized Release arm64 iPhoneOS **unsigned signing package**, not a directly installable or App Store/TestFlight build. User reported 3.4.0 installed on a real iPhone but launch failed. Corrected 3.4.1 real-iPhone installation/launch remains UNVERIFIED until tested. Simulator success does not prove physical iPhone behavior. iPhone ↔ Android Bluetooth and single-scan offline demo transfers remain OPEN / UNVERIFIED. Both apps must remain foreground for Bluetooth; missing verified receiver ACK stays Pending.

Local demo only: no real money, banking settlement, verified phone ownership/backend or production security certification. No Soundbox hardware work. See docs/IOS-LAUNCH-FIX-3.4.1.md and docs/IOS-SIGNING.md.

Source: ${process.env.GITHUB_SHA}
Build: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
`);
