import CoreLocation
import CoreMotion
import UIKit

/**
 * iOS automatic trips (B-95). iOS gives no background broadcast like Android's activity transitions, so:
 *
 * - **Wake-up:** significant location changes (cell / Wi-Fi, roughly every 500 m+). iOS wakes — or relaunches, even
 *   after the app was closed — the app in the background for each one. Needs "Always" location; costs almost no
 *   battery (no GPS). The trip's own GPS is expo-location's `TRIP_TASK` (it sets `allowsBackgroundLocationUpdates`
 *   on its manager), so this manager never starts standard updates and doesn't need that flag.
 * - **Departure:** a 150 m region around where the last trip ended (`watchDeparture`). Leaving it wakes the app
 *   sooner than a significant change, and JS then counts the stretch from the parking spot (`seedDepartureStart`).
 * - **What happened:** on every wake-up (location event, wake timer, app start / foreground, live motion update) the
 *   CoreMotion history since the last read is copied into `TripEventLog` as raw `motion` snapshots with their real
 *   start time. JS turns snapshots into enter / exit transitions (`src/features/trips/auto/motion.ts`) and runs the
 *   same `engine.step` as Android, so a trip found a few minutes late still starts when driving began.
 * - **Running JS:** a background relaunch loads the whole app, JS bundle included (Expo's app delegate starts React
 *   Native in `didFinishLaunching`, which is also how expo-task-manager tasks run on iOS). `backgroundTask.ts` runs
 *   one engine pass at bundle load and listens to `onSignal`; events sent before JS listens are kept (`pending`) and
 *   sent when it starts observing.
 * - **End of trip / "Still on a trip?":** while a trip records, `TRIP_TASK` keeps the app running in the background,
 *   so the wake timer (`scheduleWake`, the twin of Android's alarm) fires and runs the engine.
 *
 * Everything here runs on the main thread.
 */
final class TripWatcher: NSObject, CLLocationManagerDelegate {
  static let shared = TripWatcher()

  private static let watchKey = "sundaysort.tripdetect.watch"
  private static let lastMotionAtKey = "sundaysort.tripdetect.lastMotionAt"
  private static let lastMotionKey = "sundaysort.tripdetect.lastMotion"
  /** First read after turning on: just enough to back-date a drive that is already under way. */
  private static let firstLookbackMs = 15 * 60_000.0
  /** Never copy more history than this in one go (phone off for days): an old drive can't be recorded anyway. */
  private static let maxLookbackMs = 6 * 3_600_000.0
  private static let departureId = "sundaysort.departure"
  private static let departureRadius = 150.0
  /** Background time asked for after a wake-up: JS cold start + engine + starting GPS. */
  private static let backgroundHoldSeconds = 25.0

  private var location: CLLocationManager?
  private let motion = CMMotionActivityManager()
  private var liveMotion = false
  private var querying = false
  private var waiting: [([String: Any]?) -> Void] = []
  private var wakeTimer: DispatchSourceTimer?
  private(set) var wakeAtMs: Double = 0
  private var bgTask: UIBackgroundTaskIdentifier = .invalid
  private var bgGeneration = 0
  private var pending: [String: Any]?
  private(set) var backgroundRefreshAvailable = true

  /** Set by the module while JS listens to `onSignal`. */
  var onSignal: (([String: Any]) -> Void)? {
    didSet {
      if let cb = onSignal, let e = pending {
        pending = nil
        cb(e)
      }
    }
  }

  /** start() was called and stop() not since (persisted: a relaunch resumes it). */
  var watching: Bool {
    UserDefaults.standard.bool(forKey: Self.watchKey)
  }

  private override init() {
    super.init()
    NotificationCenter.default.addObserver(self, selector: #selector(onForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(onRefreshStatus), name: UIApplication.backgroundRefreshStatusDidChangeNotification, object: nil)
    Self.onMain { self.onRefreshStatus() }
  }

  static func onMain(_ block: @escaping () -> Void) {
    if Thread.isMainThread { block() } else { DispatchQueue.main.async(execute: block) }
  }

  // MARK: - On / off

  func start() {
    UserDefaults.standard.set(true, forKey: Self.watchKey)
    Self.onMain {
      self.beginMonitoring()
      self.ingest { newest in if let e = newest { self.emit(e) } }
    }
  }

  func stop() {
    UserDefaults.standard.set(false, forKey: Self.watchKey)
    Self.onMain {
      // Monitoring outlives the process: stop it even if this launch never created a manager.
      let manager = self.location ?? CLLocationManager()
      manager.stopMonitoringSignificantLocationChanges()
      manager.monitoredRegions.filter { $0.identifier == Self.departureId }.forEach { manager.stopMonitoring(for: $0) }
      manager.delegate = nil
      self.location = nil
      if self.liveMotion {
        self.motion.stopActivityUpdates()
        self.liveMotion = false
      }
    }
  }

  /**
   * App launch, including a background relaunch for a location event: the event is only delivered to a location
   * manager that monitors again, so re-create it right away.
   */
  func resumeAtLaunch(relaunchedForLocation: Bool) {
    guard watching else { return }
    Self.onMain {
      if relaunchedForLocation { self.holdBackground() }
      self.beginMonitoring()
    }
  }

  private func beginMonitoring() {
    if location == nil {
      let m = CLLocationManager()
      m.delegate = self
      location = m
    }
    if CLLocationManager.significantLocationChangeMonitoringAvailable() {
      location?.startMonitoringSignificantLocationChanges()
    }
    startLiveMotion()
  }

  /** Delivered only while the app runs (foreground, or background during a trip): each update triggers a read. */
  private func startLiveMotion() {
    guard !liveMotion, CMMotionActivityManager.isActivityAvailable(), CMMotionActivityManager.authorizationStatus() == .authorized else { return }
    liveMotion = true
    motion.startActivityUpdates(to: .main) { [weak self] activity in
      guard let self = self, activity != nil else { return }
      self.ingest { newest in if let e = newest { self.emit(e) } }
    }
  }

  // MARK: - Wake-ups

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last else { return }
    holdBackground()
    // No coordinates: the log goes into "Share trip diagnostics".
    let wake = TripEventLog.add("wake", [
      "reason": "location",
      "accuracy": loc.horizontalAccuracy,
      "speed": loc.speed,
      "fixAt": loc.timestamp.timeIntervalSince1970 * 1000,
    ])
    ingest { newest in self.emit(newest ?? wake) }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    // kCLErrorLocationUnknown is temporary; a denial shows up in health() (backgroundLocation).
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    startLiveMotion()
  }

  /** Region around the last parking spot (replaces the previous one). Only while watching. */
  func watchDeparture(lat: Double, lng: Double) {
    Self.onMain {
      guard self.watching, let manager = self.location,
            CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else { return }
      let center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
      if let current = manager.monitoredRegions.first(where: { $0.identifier == Self.departureId }) as? CLCircularRegion,
         CLLocation(latitude: current.center.latitude, longitude: current.center.longitude)
           .distance(from: CLLocation(latitude: lat, longitude: lng)) < 20 {
        return
      }
      let region = CLCircularRegion(center: center, radius: Self.departureRadius, identifier: Self.departureId)
      region.notifyOnEntry = false
      region.notifyOnExit = true
      manager.startMonitoring(for: region)
    }
  }

  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    guard region.identifier == Self.departureId else { return }
    manager.stopMonitoring(for: region)
    holdBackground()
    let wake = TripEventLog.add("wake", ["reason": "departure"])
    ingest { newest in self.emit(newest ?? wake) }
  }

  func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
    // Departure is only a faster start; significant changes still wake the app.
  }

  @objc private func onForeground() {
    guard watching else { return }
    startLiveMotion()
    ingest { newest in if let e = newest { self.emit(e) } }
  }

  @objc private func onRefreshStatus() {
    backgroundRefreshAvailable = UIApplication.shared.backgroundRefreshStatus == .available
  }

  /** One pending wake-up (end-of-trip / "Still on a trip?" check) — Android's alarm. Fires only while the app runs. */
  func scheduleWake(atMs: Double) {
    Self.onMain {
      self.wakeTimer?.cancel()
      let delay = Swift.max(0, atMs - TripEventLog.nowMs()) / 1000
      let timer = DispatchSource.makeTimerSource(queue: .main)
      // Wall clock: the monotonic clock stops while the phone sleeps.
      timer.schedule(wallDeadline: .now() + delay, leeway: .seconds(5))
      timer.setEventHandler { [weak self] in
        guard let self = self else { return }
        self.wakeTimer?.cancel()
        self.wakeTimer = nil
        self.wakeAtMs = 0
        self.holdBackground()
        let wake = TripEventLog.add("wake", ["reason": "timer"])
        self.ingest { newest in self.emit(newest ?? wake) }
      }
      self.wakeTimer = timer
      self.wakeAtMs = atMs
      timer.resume()
    }
  }

  func cancelWake() {
    Self.onMain {
      self.wakeTimer?.cancel()
      self.wakeTimer = nil
      self.wakeAtMs = 0
    }
  }

  /** Dev builds: log a fake signal and run the JS engine as a real one would. */
  func simulate(_ event: [String: Any], kind: String) {
    Self.onMain {
      self.emit(TripEventLog.add(kind, event))
    }
  }

  // MARK: - CoreMotion history → log

  /**
   * Copies CoreMotion snapshots that started since the last read into the log. `done` gets the newest new event
   * (nil when nothing new). Calls that arrive during a query wait for the next one.
   */
  func ingest(_ done: @escaping ([String: Any]?) -> Void) {
    Self.onMain {
      self.waiting.append(done)
      if !self.querying { self.runQuery() }
    }
  }

  private func runQuery() {
    let callbacks = waiting
    waiting = []
    guard CMMotionActivityManager.isActivityAvailable(), CMMotionActivityManager.authorizationStatus() == .authorized else {
      // Not authorised: never query (it would show the permission prompt, possibly in the background).
      callbacks.forEach { $0(nil) }
      return
    }
    querying = true
    let nowMs = TripEventLog.nowMs()
    let last = UserDefaults.standard.double(forKey: Self.lastMotionAtKey)
    let fromMs = Swift.max(last > 0 ? last : nowMs - Self.firstLookbackMs, nowMs - Self.maxLookbackMs)
    let from = Date(timeIntervalSince1970: fromMs / 1000)
    let to = Date(timeIntervalSince1970: nowMs / 1000)
    motion.queryActivityStarting(from: from, to: to, to: .main) { [weak self] list, error in
      guard let self = self else { return }
      self.querying = false
      var newest: [String: Any]?
      if let error = error {
        newest = TripEventLog.add("wake", ["reason": "motion_error", "error": error.localizedDescription])
      } else {
        newest = self.record(list ?? []).last
      }
      callbacks.forEach { $0(newest) }
      if !self.waiting.isEmpty { self.runQuery() }
    }
  }

  /** Logs snapshots newer than the last one logged, skipping repeats of the same activity + confidence. */
  private func record(_ list: [CMMotionActivity]) -> [[String: Any]] {
    let defaults = UserDefaults.standard
    var lastAt = defaults.double(forKey: Self.lastMotionAtKey)
    var lastKey = defaults.string(forKey: Self.lastMotionKey)
    var out: [[String: Any]] = []
    for a in list.sorted(by: { $0.startDate < $1.startDate }) {
      let at = a.startDate.timeIntervalSince1970 * 1000
      if at <= lastAt { continue }
      lastAt = at
      let name = Self.name(a)
      if name == "unknown" { continue }
      let key = "\(name)|\(a.confidence.rawValue)"
      if key == lastKey { continue }
      lastKey = key
      out.append(["activity": name, "confidence": a.confidence.rawValue, "eventAt": at])
    }
    defaults.set(lastAt, forKey: Self.lastMotionAtKey)
    defaults.set(lastKey, forKey: Self.lastMotionKey)
    return TripEventLog.addAll("motion", out)
  }

  static func name(_ a: CMMotionActivity) -> String {
    // Automotive first: at red lights CoreMotion reports automotive + stationary.
    if a.automotive { return "driving" }
    if a.cycling { return "cycling" }
    if a.running { return "running" }
    if a.walking { return "walking" }
    if a.stationary { return "still" }
    return "unknown"
  }

  // MARK: - Helpers

  private func emit(_ event: [String: Any]) {
    if let cb = onSignal { cb(event) } else { pending = event }
  }

  /** Keeps the app alive long enough for JS to start a trip after a background wake-up. */
  private func holdBackground() {
    bgGeneration += 1
    let generation = bgGeneration
    if bgTask == .invalid {
      bgTask = UIApplication.shared.beginBackgroundTask(withName: "SundayTripDetect") { [weak self] in
        self?.endBackground()
      }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.backgroundHoldSeconds) { [weak self] in
      guard let self = self, self.bgGeneration == generation else { return }
      self.endBackground()
    }
  }

  private func endBackground() {
    guard bgTask != .invalid else { return }
    UIApplication.shared.endBackgroundTask(bgTask)
    bgTask = .invalid
  }
}
