import CoreMotion
import ExpoModulesCore

/**
 * iOS side of automatic trips (S1). iOS cannot see the van's Bluetooth from the background, so trips start from
 * motion: CoreMotion "automotive" plus significant location changes (expo-location). This skeleton exposes live
 * activity updates (foreground) and the motion history query S1 uses to back-date a trip start.
 */
public class TripDetectModule: Module {
  private let manager = CMMotionActivityManager()
  private var observing = false

  public func definition() -> ModuleDefinition {
    Name("SundayTripDetect")

    Events("onSignal")

    Function("isActivityAvailable") { () -> Bool in
      CMMotionActivityManager.isActivityAvailable()
    }

    Function("hasActivityPermission") { () -> Bool in
      CMMotionActivityManager.authorizationStatus() == .authorized
    }

    AsyncFunction("startTransitions") { () in
      guard CMMotionActivityManager.isActivityAvailable(), !self.observing else { return }
      self.observing = true
      self.manager.startActivityUpdates(to: OperationQueue.main) { [weak self] activity in
        guard let self = self, let a = activity else { return }
        self.sendEvent("onSignal", [
          "kind": "activity",
          "activity": Self.name(a),
          "transition": "enter",
          "confidence": a.confidence.rawValue,
          "at": Date().timeIntervalSince1970 * 1000,
          "eventAt": a.startDate.timeIntervalSince1970 * 1000,
        ])
      }
    }

    AsyncFunction("stopTransitions") { () in
      self.manager.stopActivityUpdates()
      self.observing = false
    }

    /** Motion history between two epoch-ms times (CoreMotion keeps about 7 days). */
    AsyncFunction("queryActivities") { (fromMs: Double, toMs: Double, promise: Promise) in
      let from = Date(timeIntervalSince1970: fromMs / 1000)
      let to = Date(timeIntervalSince1970: toMs / 1000)
      self.manager.queryActivityStarting(from: from, to: to, to: OperationQueue.main) { list, error in
        if let error = error {
          promise.reject("E_MOTION", error.localizedDescription)
          return
        }
        promise.resolve((list ?? []).map { a in
          [
            "activity": Self.name(a),
            "confidence": a.confidence.rawValue,
            "eventAt": a.startDate.timeIntervalSince1970 * 1000,
          ] as [String: Any]
        })
      }
    }

    // Android-only signals: keep the JS API identical on both platforms.
    Function("getRecentEvents") { (_: Double) -> [[String: Any]] in [] }
    Function("clearEvents") {}
    Function("isCharging") { () -> Bool in false }
    Function("watchPower") { (_: Bool) in }
    Function("getBondedDevices") { () -> [[String: Any]] in [] }
    AsyncFunction("startSampling") { (_: Double) in }
    AsyncFunction("stopSampling") { () in }
  }

  private static func name(_ a: CMMotionActivity) -> String {
    if a.automotive { return "driving" }
    if a.cycling { return "cycling" }
    if a.running { return "running" }
    if a.walking { return "walking" }
    if a.stationary { return "still" }
    return "unknown"
  }
}
