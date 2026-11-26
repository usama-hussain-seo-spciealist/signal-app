import XCTest
@testable import SignalPayNearby

final class NearbyFrameTests: XCTestCase {
 func testSharedAndroidGoldenFrames() throws {
  let frames = try NearbyFrame.split("Hello SignalPay", id: 7, valueLength: 20)
  XCTAssertEqual(frames.map { $0.map { String(format: "%02x", $0) }.joined() }, ["530100070000000f48656c6c6f205369676e616c", "53010007000c000f506179"])
  let decoder = NearbyAssembler()
  XCTAssertNil(try decoder.accept(frames[0], now: 1))
  XCTAssertNil(try decoder.accept(frames[0], now: 2))
  XCTAssertEqual(try decoder.accept(frames[1], now: 3), "Hello SignalPay")
 }
 func testUTF8AndBounds() throws {
  let text = String(repeating: "ادائیگی🙂", count: 80), decoder = NearbyAssembler()
  var result: String?
  for frame in try NearbyFrame.split(text, id: 42, valueLength: 182) { result = try decoder.accept(frame, now: 1) }
  XCTAssertEqual(result, text)
  XCTAssertThrowsError(try NearbyFrame.split(String(repeating: "x", count: 8193), id: 1, valueLength: 20))
  XCTAssertThrowsError(try NearbyFrame.split("x", id: 0, valueLength: 20))
 }
 func testGapTimeoutAndMalformedUTF8() throws {
  let frames = try NearbyFrame.split("Hello SignalPay", id: 7, valueLength: 20), decoder = NearbyAssembler()
  XCTAssertThrowsError(try decoder.accept(frames[1], now: 1))
  XCTAssertNil(try decoder.accept(frames[0], now: 1))
  XCTAssertThrowsError(try decoder.accept(frames[1], now: 12))
  XCTAssertThrowsError(try decoder.accept(Data([0x53,1,0,1,0,0,0,1,0xff]), now: 13))
 }
 func testAccountRouting() throws {
  XCTAssertEqual(try NearbyFrame.serviceUUID(accountID: "SP-0123456789abcdef0123456789abcdef").uuidString.lowercased(), "01234567-89ab-cdef-0123-456789abcdef")
  XCTAssertThrowsError(try NearbyFrame.serviceUUID(accountID: "untrusted-name"))
 }
}
