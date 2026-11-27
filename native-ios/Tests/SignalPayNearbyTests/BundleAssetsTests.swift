import XCTest
import Foundation
import CryptoKit
@testable import SignalPayNearby

final class BundleAssetsTests: XCTestCase {
 private func fixture() throws -> URL {
  // /private/tmp and /tmp refer to the same files on Darwin, like iPhone /private/var and /var.
  let root = URL(fileURLWithPath:"/private/tmp/SignalPayAssetProbe-\(UUID().uuidString)/www",isDirectory:true)
  try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true)
  for name in BundleAssets.required { try Data("test resource \(name)".utf8).write(to:root.appendingPathComponent(name)) }
  let entries = try BundleAssets.required.map { name -> [String:Any] in
   let bytes = try Data(contentsOf:root.appendingPathComponent(name)); return ["path":name,"bytes":bytes.count,"sha256":SHA256.hash(data:bytes).map {String(format:"%02x",$0)}.joined()]
  }
  try JSONSerialization.data(withJSONObject:["format":"signalpay-bundled-assets","v":1,"files":entries]).write(to:root.appendingPathComponent(BundleAssets.manifestName))
  return root
 }
 private func clean(_ root: URL) { let parent = root.deletingLastPathComponent(); if parent.lastPathComponent.hasPrefix("SignalPayAssetProbe-") { try? FileManager.default.removeItem(at:parent) } }
 func testPrivatePrefixAndTrailingSlashResolveSameReadableAsset() throws {
  let root = try fixture();defer {clean(root)}
  let legacy = root.appendingPathComponent("index.html").standardizedFileURL
  print("PATH_PROBE " + String(data:try JSONSerialization.data(withJSONObject:["root":root.path,"legacyCandidate":legacy.path,"legacyPrefixAccepted":legacy.path.hasPrefix(root.path+"/"),"fileExists":FileManager.default.fileExists(atPath:legacy.path)]),encoding:.utf8)!)
  for base in [root,root.resolvingSymlinksInPath(),URL(fileURLWithPath:root.path+"/",isDirectory:true)] {
   XCTAssertEqual(try BundleAssets.data(root:base,relative:"index.html"),Data("test resource index.html".utf8))
   XCTAssertEqual(try BundleAssets.validate(root:base),BundleAssets.required.count)
  }
 }
 func testSymlinkAliasInsideRootWorksButOutsideRootCannotEscape() throws {
  let root = try fixture();defer {clean(root)}
  try FileManager.default.createSymbolicLink(at:root.appendingPathComponent("inside.html"),withDestinationURL:root.appendingPathComponent("index.html"))
  XCTAssertEqual(try BundleAssets.data(root:root,relative:"inside.html"),Data("test resource index.html".utf8))
  let outside = root.deletingLastPathComponent().appendingPathComponent("outside.html");try Data("private".utf8).write(to:outside)
  try FileManager.default.createSymbolicLink(at:root.appendingPathComponent("escape.html"),withDestinationURL:outside)
  XCTAssertThrowsError(try BundleAssets.data(root:root,relative:"escape.html"))
  for invalid in ["../outside.html","/etc/passwd","index.html/../index.html","a\\b",""] { XCTAssertThrowsError(try BundleAssets.file(root:root,relative:invalid)) }
 }
 func testManifestDetectsMissingAndChangedResources() throws {
  let root = try fixture();defer {clean(root)};XCTAssertNoThrow(try BundleAssets.validate(root:root))
  try Data("changed".utf8).write(to:root.appendingPathComponent("app.js"));XCTAssertThrowsError(try BundleAssets.validate(root:root))
  try FileManager.default.removeItem(at:root.appendingPathComponent("index.html"));XCTAssertThrowsError(try BundleAssets.validate(root:root))
 }
 func testManifestItselfIsRequired() throws {
  let root = try fixture();defer {clean(root)}
  try FileManager.default.removeItem(at:root.appendingPathComponent(BundleAssets.manifestName));XCTAssertThrowsError(try BundleAssets.validate(root:root))
 }
}
