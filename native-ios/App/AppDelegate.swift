import UIKit

@main final class AppDelegate: UIResponder, UIApplicationDelegate {
 func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
  let configuration = UISceneConfiguration(name: "SignalPay", sessionRole: connectingSceneSession.role); configuration.delegateClass = SceneDelegate.self; return configuration
 }
}
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
 var window: UIWindow?
 private var wallet: WalletController?
 func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
  guard let scene = scene as? UIWindowScene else { return }
  let controller = WalletController(); wallet = controller
  let window = UIWindow(windowScene: scene); window.rootViewController = controller; self.window = window; window.makeKeyAndVisible()
 }
 func sceneWillResignActive(_ scene: UIScene) { wallet?.coverForPrivacy() }
 func sceneDidEnterBackground(_ scene: UIScene) { wallet?.lockForBackground() }
 func sceneDidBecomeActive(_ scene: UIScene) { wallet?.becameActive() }
}
