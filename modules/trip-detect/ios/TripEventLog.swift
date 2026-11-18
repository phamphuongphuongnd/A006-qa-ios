import Foundation

/**
 * Persistent ring buffer of detection signals — the iOS twin of Android's `EventLog.kt` (B-95).
 * The watcher writes here first (the JS runtime may not be loaded yet when iOS relaunches the app for a location
 * event); JS reads it back through `getRecentEvents(sinceMs)` and runs the same engine as Android.
 *
 * Kept in a file (Application Support, protection "until first unlock") instead of UserDefaults: when iOS wakes the
 * app before the first unlock after a reboot the file can't be read, and we must then skip the write instead of
 * replacing the whole log with one event.
 */
enum TripEventLog {
  /** About a day of motion snapshots + a week of wake-ups (read back by "Share trip diagnostics"). */
  static let max = 1000

  private static let lock = NSLock()

  private static var url: URL? {
    guard let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
    return dir.appendingPathComponent("sundaysort-trip-events.json")
  }

  static func nowMs() -> Double {
    Date().timeIntervalSince1970 * 1000
  }

  /** nil = the file exists but can't be read right now (device locked since boot): don't overwrite it. */
  private static func load() -> [[String: Any]]? {
    guard let url = url else { return nil }
    guard FileManager.default.fileExists(atPath: url.path) else { return [] }
    guard let data = try? Data(contentsOf: url) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] ?? []
  }

  private static func save(_ events: [[String: Any]]) {
    guard let url = url, let data = try? JSONSerialization.data(withJSONObject: events) else { return }
    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try? data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }

  /** Appends one event of `kind` per entry of `extras` (all stamped `at` = now) and returns them. */
  @discardableResult
  static func addAll(_ kind: String, _ extras: [[String: Any]]) -> [[String: Any]] {
    if extras.isEmpty { return [] }
    let at = nowMs()
    let events: [[String: Any]] = extras.map { extra in
      var e = extra
      e["kind"] = kind
      e["at"] = at
      return e
    }
    lock.lock()
    defer { lock.unlock() }
    guard var all = load() else { return events }
    all.append(contentsOf: events)
    if all.count > max { all.removeFirst(all.count - max) }
    save(all)
    return events
  }

  @discardableResult
  static func add(_ kind: String, _ extra: [String: Any] = [:]) -> [String: Any] {
    addAll(kind, [extra]).first ?? extra
  }

  static func read(sinceMs: Double) -> [[String: Any]] {
    lock.lock()
    defer { lock.unlock() }
    return (load() ?? []).filter { (($0["at"] as? NSNumber)?.doubleValue ?? 0) >= sinceMs }
  }

  static func clear() {
    lock.lock()
    defer { lock.unlock() }
    save([])
  }
}
