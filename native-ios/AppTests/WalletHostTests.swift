import XCTest
import WebKit
@testable import SignalPay

/// iOS Simulator/WebKit tests. No Bluetooth radio or physical device is simulated as verified.
@MainActor final class WalletHostTests: XCTestCase {
 private var windows: [UIWindow] = []
 private func js(_ host: WalletController, _ body: String) async throws -> Any? {
  try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Any?,Error>) in
   SPCallAsyncJavaScript(host.webView,body) { value,error in
    if let error { continuation.resume(throwing:error) } else { continuation.resume(returning:value) }
   }
  }
 }
 private func assertJS(_ host: WalletController, _ body: String) async throws { let value = try await js(host,body);XCTAssertEqual(value as? Bool,true) }
 private func wait(_ host: WalletController, _ expression: String) async throws {
  for _ in 0..<300 {
   if try await js(host,"return Boolean(\(expression))") as? Bool == true { return }; try await Task.sleep(nanoseconds:100_000_000)
  }
  let errors = try? await js(host,"return document.body.innerText")
  XCTFail("Timed out: \(expression). Visible page: \(errors ?? "unavailable")"); throw HostError.timeout
 }
 private func host(_ store: WKWebsiteDataStore = .nonPersistent()) async throws -> WalletController {
  let controller = WalletController(dataStore:store)
  let scene = UIApplication.shared.connectedScenes.compactMap {$0 as? UIWindowScene}.first!
  let window = UIWindow(windowScene:scene); window.rootViewController = controller; windows.append(window); window.makeKeyAndVisible()
  try await wait(controller,"document.readyState==='complete' && document.getElementById('authScreen') && !document.getElementById('authScreen').hidden")
  return controller
 }
 private func closeHosts() { for window in windows { window.isHidden = true; window.rootViewController = nil }; windows = [] }
 private func register(_ h: WalletController) async throws {
  _ = try await js(h,"if(document.getElementById('registerForm').hidden)document.getElementById('toggleAuth').click();document.getElementById('registerName').value='Usama';document.getElementById('registerMobile').value='+923001119900';document.getElementById('registerPin').value='58271496';document.getElementById('confirmPin').value='58271496';document.getElementById('registerForm').requestSubmit();return true")
  try await wait(h,"!document.getElementById('appContent').hidden")
 }
 private func login(_ h: WalletController) async throws {
  _ = try await js(h,"if(!document.getElementById('registerForm').hidden)document.getElementById('toggleAuth').click();document.getElementById('loginMobile').value='+923001119900';document.getElementById('loginPin').value='58271496';document.getElementById('loginForm').requestSubmit();return true")
  try await wait(h,"!document.getElementById('appContent').hidden")
 }
 private func wallet(_ h: WalletController) async throws -> String {
  try await js(h,"const w=await store.read();return JSON.stringify({id:w.account.id,qr:w.accountQR,balance:w.balance,available:SignalAccounts.available(w),rows:w.transactions})") as! String
 }
 func testBundledSecureContextAndNativeBridgeWithoutRadio() async throws {
  defer {closeHosts()}; let h = try await host()
  try await assertJS(h,"return window.isSecureContext && !!crypto.subtle && !!indexedDB && !!SignalNativeIOS && !!SignalCamera && !!SignalNearby")
  _ = try await js(h,"SignalNearby.postMessage(JSON.stringify({action:'status'}));return true")
  try await wait(h,"document.getElementById('nearbyStatus').textContent.includes('Native iOS foreground Bluetooth adapter')")
  try await assertJS(h,"return document.querySelectorAll('script[src]').length>10 && [...document.querySelectorAll('script[src]')].every(s=>new URL(s.src).origin===location.origin)")
 }
 func testPinLoginAndSameQRSurviveWebViewRecreation() async throws {
  defer {closeHosts()}; let store = WKWebsiteDataStore.nonPersistent(),first = try await host(store); try await register(first); let before = try await wallet(first)
  _ = try await js(first,"lockSession();return true")
  let reopened = try await host(store); try await login(reopened); let after = try await wallet(reopened);XCTAssertEqual(after,before)
  try await assertJS(reopened,"const w=await vault.read();return w.privateKey.extractable===false && (await vault.profile()).phoneVerified===false")
 }
 func testEncryptedProfileMigrationKeepsPendingTransactionAndRefusesOverwrite() async throws {
  defer {closeHosts()}; let old = try await host();try await register(old)
  _ = try await js(old,"const peer=await SignalAccounts.createWallet('Adil'),p=await SignalAccounts.prepareOffer(await store.read(),peer.accountQR,10000,'offline');await store.update(w=>SignalAccounts.addOutgoing(w,p));return true")
  let before = try await wallet(old),backup = try await js(old,"return await vault.exportBackup()") as! String
  XCTAssertFalse(backup.contains("+923001119900"));XCTAssertFalse(backup.contains("58271496"))
  let restored = try await host(),encoded = String(data:try JSONSerialization.data(withJSONObject:[backup]),encoding:.utf8)!
  _ = try await js(restored,"const loaded=await vault.restoreBackup(\(encoded)[0],'+923001119900','58271496');await enterSession(loaded);return true")
  let imported = try await wallet(restored),original = try await wallet(old);XCTAssertEqual(imported,before);XCTAssertEqual(original,before)
  let error = try await js(restored,"lockSession();try{await vault.restoreBackup(\(encoded)[0],'+923001119900','58271496');return 'WRONG: replaced'}catch(e){return e.message}") as! String
  XCTAssertTrue(error.contains("already exists"));let count = try await js(restored,"return await vault.count()");XCTAssertEqual(count as? Int,1)
 }
 func testEncryptedSignedDemoTransferAndDuplicateReceiptOnIOSWebCrypto() async throws {
  defer {closeHosts()}; let h = try await host()
  let result = try await js(h,"let s=await SignalAccounts.createWallet('Usama'),r=await SignalAccounts.createWallet('Adil');const hello=await SignalNearbySession.receiver(r),out=await SignalNearbySession.sender(s,r.accountQR,hello.hello),incoming=await hello.finish(out.reply);s=SignalAccounts.addOutgoing(s,await SignalAccounts.prepareOffer(s,r.accountQR,10000,'offline'));if(s.transactions[0].status!=='Pending')throw Error('Premature success');const offer=await incoming.channel.open(await out.channel.seal(s.transactions[0].offerRaw)),decision=await SignalAccounts.prepareIncoming(r,offer,'accepted');r=SignalAccounts.addIncoming(r,decision);r=SignalAccounts.addIncoming(r,decision);const ack=await out.channel.open(await incoming.channel.seal(r.transactions[0].receiptRaw)),p=await SignalAccounts.prepareReceipt(s,ack);s=SignalAccounts.finishOutgoing(s,p);s=SignalAccounts.finishOutgoing(s,p);return s.balance===2490000&&r.balance===2510000&&s.transactions.length===1&&r.transactions.length===1&&s.transactions[0].id===r.transactions[0].id")
  XCTAssertEqual(result as? Bool,true)
 }
 func testBackgroundLocksWalletAndKeepsAccount() async throws {
  defer {closeHosts()}; let h=try await host();try await register(h);let before=try await wallet(h)
  h.coverForPrivacy();h.lockForBackground();try await wait(h,"document.getElementById('appContent').hidden && document.getElementById('accountName').textContent===''");_ = try await js(h,"SignalNearby.postMessage(JSON.stringify({action:'connect',accountId:'SP-00000000000000000000000000000000'}));return true");try await wait(h,"document.getElementById('nearbyStatus').textContent.includes('background')");h.becameActive();try await login(h);let after=try await wallet(h);XCTAssertEqual(after,before)
 }
 func testOriginAndBundledPathGuards() {
  XCTAssertTrue(WalletController.isLocal(BundleServer.home));XCTAssertFalse(WalletController.isLocal(URL(string:"https://evil.example/signal-app/index.html")));XCTAssertFalse(WalletController.isLocal(URL(string:"http://127.0.0.1:18744/signal-app/index.html")))
  XCTAssertFalse(WalletController.externalAllowed(URL(string:"https://github.com/other/repo")!));XCTAssertEqual(BundleServer.relativeAsset(target:"/signal-app/index.html?v=3.4.0"),"index.html");XCTAssertNil(BundleServer.relativeAsset(target:"/signal-app/%2e%2e/secret"));XCTAssertNil(BundleServer.relativeAsset(target:"/elsewhere/index.html"))
 }
 func testInstalledBundleManifestAndProductionHTTPRoutes() async throws {
  defer {closeHosts()};_ = try await host()
  let root = try XCTUnwrap(BundleServer.resourceRoot)
  XCTAssertGreaterThanOrEqual(try BundleAssets.validate(root:root),40)
  for name in ["index.html","app.js","auth-store.js","scanner.js","nearby.js","receipt-chime.wav"] {
   let (data,response) = try await URLSession.shared.data(from:URL(string:BundleServer.origin+"/signal-app/"+name)!)
   XCTAssertEqual((response as? HTTPURLResponse)?.statusCode,200)
   XCTAssertEqual(data,try BundleAssets.data(root:root,relative:name))
  }
  let (_,missing) = try await URLSession.shared.data(from:URL(string:BundleServer.origin+"/signal-app/absent-file.js")!)
  XCTAssertEqual((missing as? HTTPURLResponse)?.statusCode,404)
 }
 private enum HostError: Error {case timeout}
}
