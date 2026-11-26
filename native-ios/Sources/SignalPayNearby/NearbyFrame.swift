import Foundation

public enum NearbyError: Error { case malformed, limit, gap, timeout, unavailable }
public struct NearbyFrame {
 public static let maxLength = 8192
 public static func split(_ text: String, id: UInt16, valueLength: Int) throws -> [Data] {
  let data = Array(text.utf8)
  guard id > 0, !data.isEmpty, data.count <= maxLength, valueLength >= 20, valueLength <= 512 else { throw NearbyError.limit }
  var output: [Data] = []
  for offset in stride(from: 0, to: data.count, by: valueLength - 8) {
   let end = min(data.count, offset + valueLength - 8)
   output.append(Data([0x53, 1, UInt8(id >> 8), UInt8(id & 255), UInt8(offset >> 8), UInt8(offset & 255), UInt8(data.count >> 8), UInt8(data.count & 255)] + Array(data[offset..<end])))
  }
  return output
 }
 public static func serviceUUID(accountID: String) throws -> UUID {
  guard accountID.range(of: "^SP-[a-f0-9]{32}$", options: .regularExpression) != nil else { throw NearbyError.malformed }
  let h = String(accountID.dropFirst(3)), a = Array(h)
  let value = String(a[0..<8])+"-"+String(a[8..<12])+"-"+String(a[12..<16])+"-"+String(a[16..<20])+"-"+String(a[20..<32])
  guard let uuid = UUID(uuidString: value) else { throw NearbyError.malformed }; return uuid
 }
}
public final class NearbyAssembler {
 private var bytes: [UInt8] = [], id = 0, total = 0, first: TimeInterval = 0, last: TimeInterval = 0
 public init() {}
 public func reset() { bytes = []; id = 0; total = 0; first = 0; last = 0 }
 public func accept(_ data: Data, now: TimeInterval = ProcessInfo.processInfo.systemUptime) throws -> String? {
  let f = Array(data)
  guard f.count >= 9, f.count <= 512, f[0] == 0x53, f[1] == 1 else { throw NearbyError.malformed }
  let next = Int(f[2]) * 256 + Int(f[3]), offset = Int(f[4]) * 256 + Int(f[5]), length = Int(f[6]) * 256 + Int(f[7]), n = f.count - 8
  guard next > 0, length > 0, length <= NearbyFrame.maxLength, offset + n <= length else { throw NearbyError.limit }
  if total > 0 && (now - last > 10 || now - first > 30) { reset(); throw NearbyError.timeout }
  if total == 0 { guard offset == 0 else { throw NearbyError.gap }; id = next; total = length; first = now }
  guard id == next, total == length else { throw NearbyError.malformed }
  if offset < bytes.count { guard offset+n <= bytes.count, Array(bytes[offset..<offset+n]) == Array(f[8...]) else { throw NearbyError.malformed }; last = now; return nil }
  guard offset == bytes.count else { throw NearbyError.gap }; bytes.append(contentsOf: f[8...]); last = now
  if bytes.count != total { return nil }; let complete = Data(bytes); reset()
  guard let text = String(data: complete, encoding: .utf8) else { throw NearbyError.malformed }; return text
 }
}
