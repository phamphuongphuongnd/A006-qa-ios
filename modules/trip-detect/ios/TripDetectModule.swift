import CoreLocation
import CoreMotion
import ExpoModulesCore

/**
 * iOS side of automatic trips (S1, B-95). Same JS API as Android (`modules/trip-detect/index.ts`): signals go into a
 * persistent log read by `getRecentEvents`, and `onSignal` asks a running JS to process them. How iOS wakes the app
 * and what it logs: see `TripWatcher.swift`. iOS has no van Bluetooth / charging signals in the background.
 */
public class TripDetectModule: Module {
  private let history = CMMotionActivityManager()

  public func definition() -> ModuleDefinition {
    Name("SundayTripDetect")

    Events("onSignal")

    OnStartObserving("onSignal") {
      TripWatcher.shared.onSignal = { [weak self] event in
        self?.sendEvent("onSignal", event)
      }
    }

    OnStopObserving("onSignal") {
      TripWatcher.shared.onSignal = nil
    }

    Function("isActivityAvailable") { () -> Bool in
      CMMotionActivityManager.isActivityAvailable()
    }

    Function("hasActivityPermission") { () -> Bool in
      CMMotionActivityManager.authorizationStatus() == .authorized
    }

    /** Significant location changes + CoreMotion (the iOS stand-in for Android's activity transitions). */
    AsyncFunction("startTransitions") { () in
      TripWatcher.shared.start()
    }

    AsyncFunction("stopTransitions") { () in
      TripWatcher.shared.stop()
    }

    /** Android receivers read this while JS is dead; on iOS JS always runs after a wake-up, so there is nothing to keep. */
    Function("configure") { (_: [String: Any]) in }

    /** iOS only: wake the app when the phone leaves where the last trip ended. */
    Function("watchDeparture") { (lat: Double, lng: Double) in
      TripWatcher.shared.watchDeparture(lat: lat, lng: lng)
    }

    Function("scheduleWake") { (atMs: Double) in
      TripWatcher.shared.scheduleWake(atMs: atMs)
    }

    Function("cancelWake") {
      TripWatcher.shared.cancelWake()
    }

    Function("health") { () -> [String: Any] in
      let status = CLLocationManager.authorizationStatus()
      return [
        "activityPermission": CMMotionActivityManager.authorizationStatus() == .authorized,
        // Significant-change wake-ups need "Always" and Location Services on.
        "backgroundLocation": status == .authorizedAlways && CLLocationManager.locationServicesEnabled(),
        // Background App Refresh off / Low Power Mode: iOS may not wake the app → "may miss drives".
        "batteryOptimized": !TripWatcher.shared.backgroundRefreshAvailable || ProcessInfo.processInfo.isLowPowerModeEnabled,
        "backgroundRestricted": false,
        "restrictedBucket": false,
        "registered": TripWatcher.shared.watching,
        "manufacturer": "apple",
      ]
    }

    Function("simulate") { (kind: String, activity: String?, transition: String?, address: String?) in
      var event: [String: Any] = [:]
      if let activity = activity {
        // A fake CoreMotion snapshot: goes through the same JS conversion as real ones.
        TripWatcher.shared.simulate(["activity": activity, "confidence": 2, "eventAt": TripEventLog.nowMs()], kind: "motion")
        return
      }
      if let transition = transition { event["transition"] = transition }
      if let address = address { event["address"] = address }
      TripWatcher.shared.simulate(event, kind: kind)
    }

    /** Motion history between two epoch-ms times (CoreMotion keeps about 7 days). */
    AsyncFunction("queryActivities") { (fromMs: Double, toMs: Double, promise: Promise) in
      let from = Date(timeIntervalSince1970: fromMs / 1000)
      let to = Date(timeIntervalSince1970: toMs / 1000)
      self.history.queryActivityStarting(from: from, to: to, to: OperationQueue.main) { list, error in
        if let error = error {
          promise.reject("E_MOTION", error.localizedDescription)
          return
        }
        promise.resolve((list ?? []).map { a in
          [
            "activity": TripWatcher.name(a),
            "confidence": a.confidence.rawValue,
            "eventAt": a.startDate.timeIntervalSince1970 * 1000,
          ] as [String: Any]
        })
      }
    }

    Function("getRecentEvents") { (sinceMs: Double) -> [[String: Any]] in
      TripEventLog.read(sinceMs: sinceMs)
    }

    Function("clearEvents") {
      TripEventLog.clear()
    }

    // Android-only signals: keep the JS API identical on both platforms (isCharging: dev screen only).
    Function("isCharging") { () -> Bool in false }
    Function("getBondedDevices") { () -> [[String: Any]] in [] }
    AsyncFunction("startSampling") { (_: Double) in }
    AsyncFunction("stopSampling") { () in }
  }
}
