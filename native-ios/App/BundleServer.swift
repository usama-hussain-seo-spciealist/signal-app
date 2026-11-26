import Foundation
import Network

/// Read-only bundled assets on a stable, loopback-only origin. Never serves wallet data.
final class BundleServer {
 static let shared = BundleServer()
 static let port: UInt16 = 18743
 static let origin = "http://127.0.0.1:18743"
 static let home = URL(string: origin + "/signal-app/index.html")!
 private var listener: NWListener?
 private let queue = DispatchQueue(label: "SignalPay.bundle.loopback")
 private var callbacks: [(Error?) -> Void] = []
 private var ready = false
 private init() {}
 func start(completion: @escaping (Error?) -> Void) {
  dispatchPrecondition(condition: .onQueue(.main))
  if ready { completion(nil); return }; callbacks.append(completion); if listener != nil { return }
  do {
   let params = NWParameters.tcp
   params.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: NWEndpoint.Port(rawValue: Self.port)!)
   let server = try NWListener(using: params); listener = server
   server.stateUpdateHandler = { [weak self] state in
    DispatchQueue.main.async {
     guard let self else { return }
     if case .ready = state { self.ready = true; let pending = self.callbacks; self.callbacks = []; pending.forEach {$0(nil)} }
     if case .failed(let error) = state { self.listener?.cancel(); self.listener = nil; self.ready = false; let pending = self.callbacks; self.callbacks = []; pending.forEach {$0(error)} }
    }
   }
   server.newConnectionHandler = { [weak self] connection in self?.accept(connection) }; server.start(queue: queue)
  } catch { let pending = callbacks; callbacks = []; pending.forEach {$0(error)} }
 }
 private func accept(_ connection: NWConnection) {
  connection.start(queue: queue)
  let deadline = DispatchWorkItem { connection.cancel() }; queue.asyncAfter(deadline: .now()+5, execute: deadline)
  func read(_ partial: Data) {
   connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] data,_,complete,error in
    guard let self else { connection.cancel(); return }; var buffer = partial; if let data { buffer.append(data) }
    guard buffer.count <= 8192, error == nil else { connection.cancel(); return }
    if buffer.range(of: Data("\r\n\r\n".utf8)) != nil {
     let response = self.response(buffer); connection.send(content: response, completion: .contentProcessed {_ in deadline.cancel(); connection.cancel()})
    } else if complete { connection.cancel() } else { read(buffer) }
   }
  }
  read(Data())
 }
 static func relativeAsset(target: String) -> String? {
  guard let path = target.split(separator: "?", maxSplits: 1).first.map(String.init)?.removingPercentEncoding,
        path.hasPrefix("/signal-app/"), !path.contains("\\"), !path.contains("\0") else { return nil }
  let relative = String(path.dropFirst("/signal-app/".count))
  guard !relative.split(separator: "/", omittingEmptySubsequences: false).contains("..") else { return nil }
  return relative.isEmpty ? "index.html" : relative
 }
 private func response(_ request: Data) -> Data {
  guard let header = String(data: request, encoding: .utf8) else { return reply(400, "Bad request") }
  let lines = header.components(separatedBy: "\r\n"), parts = (lines.first ?? "").split(separator: " ")
  guard parts.count == 3, parts[0] == "GET", parts[2] == "HTTP/1.1",
        lines.dropFirst().contains(where: {$0.lowercased() == "host: 127.0.0.1:18743"}),
        let relative = Self.relativeAsset(target: String(parts[1])),
        let root = Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true) else { return reply(403, "Blocked") }
  let url = root.appendingPathComponent(relative).standardizedFileURL
  guard url.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: url), data.count < 8_000_000 else { return reply(404, "Missing bundled file") }
  let mime = ["html":"text/html; charset=utf-8", "js":"application/javascript", "css":"text/css", "json":"application/json", "png":"image/png", "svg":"image/svg+xml", "wav":"audio/wav", "webmanifest":"application/manifest+json"][url.pathExtension] ?? "application/octet-stream"
  return reply(200, data, mime)
 }
 private func reply(_ code: Int, _ text: String) -> Data { reply(code, Data(text.utf8), "text/plain") }
 private func reply(_ code: Int, _ body: Data, _ mime: String) -> Data {
  let policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  return Data("HTTP/1.1 \(code) \(code == 200 ? "OK" : "Error")\r\nContent-Type: \(mime)\r\nContent-Length: \(body.count)\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nContent-Security-Policy: \(policy)\r\n\r\n".utf8) + body
 }
}
