import UIKit
import WebKit
import AVFoundation

/// Native iOS shell: bundled wallet, camera, CoreBluetooth, local sharing and lifecycle locks.
final class WalletController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
 private(set) var webView: WKWebView!
 private var transport: CoreBluetoothTransport?
 private var camera: CameraScanner?
 private var cameraRequest: String?
 private var cover: UIView?
 private var backgrounded = false
 private let speech = AVSpeechSynthesizer()
 private let dataStore: WKWebsiteDataStore
 private let scriptNames = ["SignalNearby","SignalCamera","SignalQR","SignalSoundbox"]
 init(dataStore: WKWebsiteDataStore = .default()) { self.dataStore = dataStore; super.init(nibName:nil,bundle:nil) }
 required init?(coder: NSCoder) { fatalError("init(coder:) unsupported") }
 override func viewDidLoad() {
  super.viewDidLoad(); view.backgroundColor = .systemBackground
  let config = WKWebViewConfiguration(); config.websiteDataStore = dataStore; config.allowsInlineMediaPlayback = true
  let source = """
  window.SignalNativeIOS = true;
  for (const name of ['SignalNearby','SignalCamera','SignalQR','SignalSoundbox']) {
   window[name] = {onmessage:null,postMessage:function(raw){window.webkit.messageHandlers[name].postMessage(raw);}};
  }
  """
  config.userContentController.addUserScript(WKUserScript(source:source,injectionTime:.atDocumentStart,forMainFrameOnly:true))
  // Weak proxy avoids WKUserContentController retaining the controller indefinitely.
  for name in scriptNames { config.userContentController.add(WeakMessages(self), name:name) }
  webView = WKWebView(frame:.zero,configuration:config); webView.navigationDelegate = self; webView.uiDelegate = self
  webView.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(webView)
  NSLayoutConstraint.activate([webView.leadingAnchor.constraint(equalTo:view.leadingAnchor),webView.trailingAnchor.constraint(equalTo:view.trailingAnchor),webView.topAnchor.constraint(equalTo:view.safeAreaLayoutGuide.topAnchor),webView.bottomAnchor.constraint(equalTo:view.bottomAnchor)])
  BundleServer.shared.start { [weak self] error in
   guard let self else { return }
   if let error { self.showError("Installed wallet could not open: \(error.localizedDescription) Your saved account was not reset. Update the signed app in place; keep the old app/data.") }
   else { self.webView.load(URLRequest(url:BundleServer.home)) }
  }
 }
 static func isLocal(_ url: URL?) -> Bool {
  guard let url else { return false }; return url.scheme == "http" && url.host == "127.0.0.1" && url.port == 18743 && url.user == nil && url.password == nil && url.path.hasPrefix("/signal-app/")
 }
 static func externalAllowed(_ url: URL) -> Bool {
  guard url.scheme == "https",url.user == nil,url.password == nil,(url.port == nil || url.port == 443) else { return false }
  return (url.host == "github.com" && url.path.hasPrefix("/usama-hussain-seo-spciealist/signal-app/")) || (url.host == "usama-hussain-seo-spciealist.github.io" && url.path.hasPrefix("/signal-app/"))
 }
 func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
  guard let url = action.request.url else { decisionHandler(.cancel); return }
  if Self.isLocal(url), action.targetFrame?.isMainFrame != false { decisionHandler(.allow); return }
  if action.navigationType == .linkActivated, Self.externalAllowed(url) { UIApplication.shared.open(url) }
  decisionHandler(.cancel)
 }
 func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) { decisionHandler(.deny) } // Native camera only, never web microphone.
 func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
  guard message.frameInfo.isMainFrame, Self.isLocal(message.frameInfo.request.url), Self.isLocal(webView.url),
        message.frameInfo.securityOrigin.protocol == "http",message.frameInfo.securityOrigin.host == "127.0.0.1",message.frameInfo.securityOrigin.port == 18743,
        let raw = message.body as? String,raw.utf8.count <= 6_000_000,
        let data = raw.data(using:.utf8),let command = try? JSONSerialization.jsonObject(with:data) as? [String:Any] else { return }
  if backgrounded && command["action"] as? String != "stop" {
   if message.name == "SignalNearby" { send("SignalNearby",["type":"error","detail":"App is in the background. Unlock and reopen Receive; unconfirmed payments remain Pending."]) }; return
  }
  switch message.name {
  case "SignalNearby": nearby(command)
  case "SignalCamera": scan(command)
  case "SignalQR": share(command)
  case "SignalSoundbox": speak(command)
  default: return
  }
 }
 private func send(_ name: String, _ value: [String:Any]) {
  guard Self.isLocal(webView.url), let bytes = try? JSONSerialization.data(withJSONObject:value),let string = String(data:bytes,encoding:.utf8),
        let argumentData = try? JSONSerialization.data(withJSONObject:[string]),let array = String(data:argumentData,encoding:.utf8) else { return }
  let script = "window.\(name)&&window.\(name).onmessage&&window.\(name).onmessage({data:\(array)[0]})"
  webView.evaluateJavaScript(script,completionHandler:nil)
 }
 private func nearby(_ command: [String:Any]) {
  guard let action = command["action"] as? String else { return }
  if action == "status" { send("SignalNearby",["type":"capability","detail":"Native iOS foreground Bluetooth adapter available. This capability check is not a physical transfer test."]); return }
  if action == "stop" { transport?.stop(); send("SignalNearby",["type":"stopped","detail":"Bluetooth stopped; saved pending transfers retained."]); return }
  do {
   if transport == nil {
    transport = CoreBluetoothTransport()
    transport?.onEvent = { [weak self] event in
     switch event {
     case .state(let detail): self?.send("SignalNearby",["type":"listening","detail":detail])
     case .connected: self?.send("SignalNearby",["type":"connected"])
     case .message(let text): self?.send("SignalNearby",["type":"message","text":text])
     case .failure(let detail): self?.send("SignalNearby",["type":"error","detail":detail])
     }
    }
   }
   if action == "send", let text = command["text"] as? String { guard text.utf8.count <= 8192 else { throw NearbyError.limit }; try transport?.send(text); return }
   guard let accountID = command["accountId"] as? String else { throw NearbyError.malformed }
   if action == "listen" { try transport?.startReceiving(accountID:accountID) }
   else if action == "connect" { try transport?.connect(accountID:accountID) }
   else { throw NearbyError.malformed }
  } catch { transport?.stop(); send("SignalNearby",["type":"error","detail":"Bluetooth not ready or interrupted. Allow Bluetooth, keep both apps open, and retry the same saved transaction. No unverified success was recorded."]) }
 }
 private func scan(_ command: [String:Any]) {
  if command["action"] as? String == "stop" { camera?.stop(); if let controller = camera { controller.dismiss(animated:false) }; camera = nil; cameraRequest = nil; return }
  guard command["action"] as? String == "scan",let request = command["requestId"] as? String,request.count < 64,camera == nil,presentedViewController == nil else { return }
  let scanner = CameraScanner(); camera = scanner; cameraRequest = request; scanner.modalPresentationStyle = .fullScreen
  scanner.onResult = { [weak self,weak scanner] raw,error in
   guard let self, self.cameraRequest == request else { return }; self.camera = nil; self.cameraRequest = nil
   scanner?.dismiss(animated:true) { self.send("SignalCamera",["requestId":request,"type":raw == nil ? (error == nil ? "cancelled" : "error") : "result","raw":raw ?? "","error":error ?? ""]) }
  }; present(scanner,animated:true)
 }
 private func share(_ command: [String:Any]) {
  guard presentedViewController == nil,let action = command["action"] as? String else { return }
  var item: Any
  if action == "share",let png = command["png"] as? String,png.hasPrefix("data:image/png;base64,"),png.count < 1_500_000,let bytes = Data(base64Encoded:String(png.dropFirst(22))),let image = UIImage(data:bytes) { item = image }
  else if ["shareBackup","shareReceipts"].contains(action),let json = command["json"] as? String,json.utf8.count < 5_000_000,let bytes = json.data(using:.utf8),let parsed = try? JSONSerialization.jsonObject(with:bytes) as? [String:Any],parsed["format"] as? String == (action == "shareBackup" ? "signalpay-encrypted-profile" : "signalpay-receipts") {
   let file = FileManager.default.temporaryDirectory.appendingPathComponent(action == "shareBackup" ? "SignalPay-encrypted-backup-\(UUID().uuidString).json" : "SignalPay-receipts-\(UUID().uuidString).json")
   do { try bytes.write(to:file,options:[.atomic,.completeFileProtection]); item = file } catch { showError("Could not prepare the selected share file."); return }
  } else { return }
  let sheet = UIActivityViewController(activityItems:[item],applicationActivities:nil); sheet.popoverPresentationController?.sourceView = view; present(sheet,animated:true)
 }
 private func speak(_ command: [String:Any]) {
  if command["action"] as? String == "stop" { speech.stopSpeaking(at:.immediate); return }
  guard command["action"] as? String == "speak",let cents = command["cents"] as? Int,cents >= 100,cents <= 10_000_000 else { return }
  let kind = command["kind"] as? String, prefix = kind == "sent" ? "Demo payment sent." : kind == "test" ? "Sound test." : "Demo payment received."
  let utterance = AVSpeechUtterance(string:"\(prefix) \(Double(cents)/100) Pakistani rupees. This is a simulation."); utterance.voice = AVSpeechSynthesisVoice(language:"en-PK") ?? AVSpeechSynthesisVoice(language:"en-GB"); speech.speak(utterance)
 }
 func coverForPrivacy() { if cover != nil { return }; let container: UIView = view.window ?? view; let shield = UIView(frame:container.bounds); shield.backgroundColor = .systemBackground; shield.autoresizingMask = [.flexibleWidth,.flexibleHeight]; container.addSubview(shield); cover = shield }
 func lockForBackground() { backgrounded = true; transport?.stop(); camera?.stop(); camera?.dismiss(animated:false); camera = nil; cameraRequest = nil; speech.stopSpeaking(at:.immediate); lockWebWallet() }
 private func lockWebWallet(_ completion: (() -> Void)? = nil) { webView.evaluateJavaScript("window.dispatchEvent(new Event('signalpay-native-lock'))") {_,_ in completion?()} }
 func becameActive() { if backgrounded { lockWebWallet { [weak self] in self?.backgrounded = false; self?.cover?.removeFromSuperview(); self?.cover = nil } } else { cover?.removeFromSuperview(); cover = nil } }
 private func showError(_ message: String) { let alert = UIAlertController(title:"SignalPay Demo",message:message,preferredStyle:.alert); alert.addAction(UIAlertAction(title:"OK",style:.default)); present(alert,animated:true) }
 deinit { transport?.stop(); camera?.stop(); for name in scriptNames { webView?.configuration.userContentController.removeScriptMessageHandler(forName:name) } }
}
private final class WeakMessages: NSObject, WKScriptMessageHandler {
 weak var target: WalletController?
 init(_ target: WalletController) { self.target = target }
 func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) { target?.userContentController(userContentController,didReceive:message) }
}
