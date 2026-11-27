import Foundation
import CryptoKit

/// Read-only bundled files. Compare canonical path components on BOTH sides:
/// physical iOS paths can include /private/var while standardized URLs use /var.
public enum BundleAssets {
 public static let manifestName = "bundle-manifest.json"
 public static let required = ["index.html","styles.css","app-version.json","account-core.js","account-store.js","auth-crypto.js","auth-store.js","nearby-session.js","nearby.js","native-scanner.js","scanner.js","migration-core.js","migration.js","app.js","session.js","updates.js","install.js","qrcode.js","jsQR.js","soundbox.js","receipt-chime.wav","manifest.webmanifest","icon.svg","icon-180.png","icon-192.png","icon-512.png"]
 public enum Failure: LocalizedError {
  case invalidPath, outsideBundle, unreadable(String), invalidManifest, missing(String), changed(String)
  public var errorDescription: String? {
   switch self {
   case .invalidPath, .outsideBundle: return "Blocked invalid bundled asset path."
   case .unreadable(let name): return "Bundled asset cannot be read: \(name)."
   case .invalidManifest: return "Installed asset manifest is invalid. Reinstall the corrected build in place."
   case .missing(let name): return "Installed package is missing required asset: \(name)."
   case .changed(let name): return "Installed asset failed integrity validation: \(name)."
   }
  }
 }
 public static func file(root: URL, relative: String) throws -> URL {
  guard root.isFileURL, !relative.isEmpty, !relative.hasPrefix("/"), !relative.contains("\\"), !relative.contains("\0") else { throw Failure.invalidPath }
  let components = relative.split(separator:"/",omittingEmptySubsequences:false)
  guard components.allSatisfy({!$0.isEmpty && $0 != "." && $0 != ".."}) else { throw Failure.invalidPath }
  let base = root.resolvingSymlinksInPath().standardizedFileURL
  let candidate = root.appendingPathComponent(relative).resolvingSymlinksInPath().standardizedFileURL
  let a = base.pathComponents, b = candidate.pathComponents
  guard b.count > a.count, Array(b.prefix(a.count)) == a else { throw Failure.outsideBundle }
  return candidate
 }
 public static func data(root: URL, relative: String) throws -> Data {
  let url = try file(root:root,relative:relative)
  guard let values = try? url.resourceValues(forKeys:[.isRegularFileKey,.fileSizeKey]), values.isRegularFile == true, let size = values.fileSize, size > 0, size < 8_000_000 else { throw Failure.unreadable(relative) }
  do { return try Data(contentsOf:url) } catch { throw Failure.unreadable(relative) }
 }
 private struct Manifest: Decodable { let format: String; let v: Int; let files: [Entry] }
 private struct Entry: Decodable { let path: String; let bytes: Int; let sha256: String }
 @discardableResult public static func validate(root: URL) throws -> Int {
  let raw = try data(root:root,relative:manifestName)
  guard raw.count < 1_000_000, let manifest = try? JSONDecoder().decode(Manifest.self,from:raw),manifest.format == "signalpay-bundled-assets",manifest.v == 1,!manifest.files.isEmpty,manifest.files.count <= 500 else { throw Failure.invalidManifest }
  let names = manifest.files.map {$0.path}
  guard Set(names).count == names.count, !names.contains(manifestName) else { throw Failure.invalidManifest }
  for name in required { guard names.contains(name) else { throw Failure.missing(name) } }
  for entry in manifest.files {
   let bytes = try data(root:root,relative:entry.path)
   let hash = SHA256.hash(data:bytes).map {String(format:"%02x",$0)}.joined()
   guard bytes.count == entry.bytes, hash == entry.sha256 else { throw Failure.changed(entry.path) }
  }
  return manifest.files.count
 }
}
