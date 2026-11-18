import ExpoModulesCore
import UIKit

/**
 * B-95: when iOS relaunches the app in the background for a significant location change, the event is delivered
 * only to a location manager that monitors again during launch — so restart monitoring here, before React Native
 * and the module registry are up.
 */
public class TripDetectAppDelegate: ExpoAppDelegateSubscriber {
  public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    TripWatcher.shared.resumeAtLaunch(relaunchedForLocation: launchOptions?[.location] != nil)
    return true
  }
}
