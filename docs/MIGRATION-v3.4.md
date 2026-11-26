# Preserve existing accounts when updating or moving to native iOS

No saved account is deleted/reset/replaced. Same-installation updates keep the existing v3 IndexedDB/PIN schema. Android retains package `com.signalpay.demo`, signing certificate and trusted HTTPS app origin. Native iOS uses `com.signalpay.demo.ios`, persistent WKWebsiteDataStore and stable internal origin `http://127.0.0.1:18743`.

## Android in-place update

Install verified v3.4 **over** the existing app, or Updates → Check for update. Keep the existing PIN. Do not uninstall/clear data. Same package/signature/origin and unchanged vault format preserve profiles/history. Real-phone upgrades remain unverified; emulator persistence and source/signing checks are separate evidence.

## iPhone Safari/PWA → native iOS

Storage is separate: mobile/PIN login alone cannot fetch Safari data because there is no backend. **Restore before choosing Register in the native app.**

1. Keep the existing PWA. Open online and use Updates/reopen until v3.4 loads. Never clear site data. Unlock with the existing PIN.
2. Choose **Export encrypted backup**. Select a private destination such as Save to Files. Confirm a `SignalPay-encrypted-backup-....json` file actually exists before continuing; a requested/cancelled download is not a verified backup. Keep PIN separately.
3. Install the signed native app using [signing instructions](IOS-SIGNING.md). Leave old PWA/data intact.
4. Expand **Move an existing SignalPay account here** on native login. Choose backup, original mobile/PIN and single-active-copy notice, then Restore.
5. Restore decrypts/audits account/private-key relationship, signed ledger and balance, contacts and receipt inbox, then atomically adds the profile. Wrong PIN/damage/conflicting account or mobile cannot overwrite an existing profile.
6. Compare original/restored full Account ID, personal QR, available/recorded demo balances, history TX IDs and receipts. Keep source intact but closed for payments. Use only the restored installation after checking the copy. There is no remote revocation.

Backup includes encrypted signing key/profile/QR/retained ledger/contacts/receipt-reconciliation state. No plaintext PIN/mobile/private key is exported. Public ID, phone lookup hash and vault metadata remain visible. Treat the backup as sensitive; numeric PIN protection is not a production hardware wallet/recovery service.

## Pending and conflicts

Migration never creates success. Pending reservations/TX IDs remain. Native retry can authenticate the saved audited receiver key even for older optical Pending rows, persist the receiver's signed hello card, and send the **same** offer over BLE. A receiver that already accepted returns its saved receipt without another credit. Bluetooth test cap PKR1,000; older higher amounts retain QR recovery. Do not create another payment to fix a missing ACK.

Same-account/mobile import refuses overwrite/merge. Log in to existing profile and keep both backups; do not uninstall/reset to force import. If a new native profile was mistakenly registered with the old mobile, resolve that conflict separately. No automatic merge or trusted rollback detection exists. Backup is a **copy**, not exclusive money: cloned/restored/malicious local state can defeat demo balance guarantees. Real funds remain disabled.

## Later iOS updates

Keep the same signing Apple Account/team, resulting bundle ID and persistent origin; install signed updates in place. Changed identity/bundle ID may create a new container. Export/verify backup first. OS eviction/tool failures/lost PIN have no backend recovery. Source PWA/Android copy is never deleted by migration.
