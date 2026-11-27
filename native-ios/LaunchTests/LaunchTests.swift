import XCTest

/// Black-box launch of the actual Release app, with its default persistent store.
/// CI creates a fresh simulator before this test. This is not a physical iPhone test.
@MainActor final class LaunchTests: XCTestCase {
 func testCleanReleaseLaunchAndRelaunchShowsWalletLogin() {
  continueAfterFailure = false
  let app = XCUIApplication()
  for attempt in 1...2 {
   app.launch()
   XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout:30))
   XCTAssertTrue(app.staticTexts["Log in to SignalPay"].waitForExistence(timeout:30),"Bundled wallet login must render, not a blank/error page")
   XCTAssertTrue(app.buttons["Log in"].exists)
   XCTAssertFalse(app.staticTexts.matching(NSPredicate(format:"label CONTAINS[c] %@","Missing bundled")).firstMatch.exists)
   XCTAssertFalse(app.alerts.firstMatch.exists)
   let screenshot = XCTAttachment(screenshot:app.screenshot())
   screenshot.name = "Release-wallet-login-launch-\(attempt)";screenshot.lifetime = .keepAlways;add(screenshot)
   app.terminate()
  }
 }
}
