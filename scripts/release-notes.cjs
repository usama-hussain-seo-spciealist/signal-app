console.log(`# SignalPay Demo for Android v1.2.0

Install the signed APK on Android 8.0 or newer. The APK bundles the existing SignalPay web application and works without a network connection.

**Demo only:** no real banking, money transfers, SMS delivery or account identity verification. All recipients and balances are fictional. Only Internet and Camera permissions are declared; camera access is requested when Start camera is tapped. Uploaded QR images are selected through the system image picker.

The build verifies the APK signature and checksum, installs and launches the release APK in an Android emulator, and runs instrumented WebView tests for sample QR decoding, simulated payments/SMS, insufficient balance/cancel, native soundbox requests/muting, origin restrictions and emulated camera start/stop. Physical phone camera scanning, real speaker/voice output, and manufacturer-specific permission/picker behavior are not certified by emulator tests.

The soundbox uses a confirmation tone and Android text-to-speech where a device voice is available. No microphone or SMS permissions are requested. Demo history stays on the device and can be reset; uninstalling removes it.

SHA256SUMS.txt and signature-verification.txt accompany the APK. Future builds use the same signing identity stored in encrypted repository Actions secrets.

Source commit: ${process.env.GITHUB_SHA}
Build: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
`);
