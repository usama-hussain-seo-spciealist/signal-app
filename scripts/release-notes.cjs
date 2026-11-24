console.log(`# SignalPay Demo for Android v${process.env.VERSION}

Persistent personal demo accounts, signed account QR codes and manual offline device-to-device QR exchange. No real funds, banking, verified personal identities or SMS service.

Receiver shows their account QR. Sender scans, enters PKR amount and confirms: status is Pending and funds are reserved. Receiver scans the payment QR and accepts or rejects, then shows a signed receipt QR. Sender scans that receipt to verify the matching transaction and finalize Successful/debit or Failed/release. The receiver records credit at acceptance; sender stays Pending until receipt return. Repeated QR scans do not apply balances twice. Lost receipt can be reopened in receiver history.

The QR channel works without Wi-Fi/mobile data after installation. There is no Bluetooth, background delivery, server ledger or reconnect synchronization. Online mode also uses manual QR exchange. Local demo storage can be tampered with, cloned, lost or restored; this is not trustworthy money or a double-spend-resistant financial system.

Android 8.0+. Account keys and ledger persist locally across restart; clearing data or uninstalling can remove them, with no recovery. The browser/PWA and APK are separate accounts. Only Internet and Camera permissions; QR file sharing opens Android's chooser using a restricted FileProvider.

Build verifies signature and checksum, installs the release in an Android emulator, runs instrumented account/QR/payment/camera/soundbox tests, and requires successful cross-engine browser verification before publishing. Browser Android/iPhone profiles, synthetic camera video and emulators do not certify physical iPhone/Android camera scans, real radio toggles, iPhone installed-PWA cold launch, share destinations or audible speech.

Source: ${process.env.GITHUB_SHA}
Build: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
`);
