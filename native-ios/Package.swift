// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "SignalPayNearby", platforms: [.iOS(.v15), .macOS(.v12)], products: [.library(name: "SignalPayNearby", targets: ["SignalPayNearby"])], targets: [.target(name: "SignalPayNearby"), .testTarget(name: "SignalPayNearbyTests", dependencies: ["SignalPayNearby"])])
