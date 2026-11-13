import ExpoModulesCore
import Foundation

/**
 * iOS only (S4): keep access to the backup folder the user picked (iCloud Drive / On My iPhone) across launches.
 * expo-file-system's Directory.pickDirectoryAsync gives a security-scoped URL that dies with the process; this
 * module turns it into a bookmark (stored in settings as base64) and does the few file operations nightly
 * backup needs inside that scope. Android needs none of this: SAF tree URIs are persisted by expo-file-system.
 */
public class BackupFolderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SundayBackupFolder")

    /** Call right after the picker returns, while the URL is still in scope. */
    Function("makeBookmark") { (uri: URL) throws -> String in
      let ok = uri.startAccessingSecurityScopedResource()
      defer { if ok { uri.stopAccessingSecurityScopedResource() } }
      let data = try uri.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
      return data.base64EncodedString()
    }

    /** Folder URL + whether the bookmark should be re-made (folder moved / renamed). */
    Function("resolve") { (bookmark: String) throws -> [String: Any] in
      let (url, stale) = try Self.resolve(bookmark)
      return ["uri": url.absoluteString, "stale": stale]
    }

    /** Copy a local file (e.g. the backup in the app's cache) into the folder, replacing a file of that name. */
    AsyncFunction("copyInto") { (bookmark: String, source: URL, name: String) throws in
      try Self.withFolder(bookmark) { folder in
        let target = folder.appendingPathComponent(name)
        var coordError: NSError?
        var copyError: Error?
        NSFileCoordinator().coordinate(writingItemAt: target, options: .forReplacing, error: &coordError) { url in
          do {
            if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
            try FileManager.default.copyItem(at: source, to: url)
          } catch {
            copyError = error
          }
        }
        if let e = coordError ?? copyError { throw e }
      }
    }

    AsyncFunction("list") { (bookmark: String) throws -> [[String: Any]] in
      try Self.withFolder(bookmark) { folder in
        let keys: [URLResourceKey] = [.fileSizeKey, .contentModificationDateKey]
        let items = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: keys)
        return items.map { u in
          let v = try? u.resourceValues(forKeys: Set(keys))
          return [
            "name": u.lastPathComponent,
            "size": v?.fileSize ?? 0,
            "modifiedAt": (v?.contentModificationDate?.timeIntervalSince1970 ?? 0) * 1000,
          ]
        }
      }
    }

    /** Copy a file out of the folder into a local path (restore from the backup list). */
    AsyncFunction("copyOut") { (bookmark: String, name: String, target: URL) throws in
      try Self.withFolder(bookmark) { folder in
        if FileManager.default.fileExists(atPath: target.path) { try FileManager.default.removeItem(at: target) }
        try FileManager.default.copyItem(at: folder.appendingPathComponent(name), to: target)
      }
    }

    AsyncFunction("remove") { (bookmark: String, name: String) throws in
      try Self.withFolder(bookmark) { folder in
        try FileManager.default.removeItem(at: folder.appendingPathComponent(name))
      }
    }
  }

  private static func resolve(_ bookmark: String) throws -> (URL, Bool) {
    guard let data = Data(base64Encoded: bookmark) else {
      throw NSError(domain: "BackupFolder", code: 1, userInfo: [NSLocalizedDescriptionKey: "Bad bookmark"])
    }
    var stale = false
    let url = try URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
    return (url, stale)
  }

  private static func withFolder<T>(_ bookmark: String, _ body: (URL) throws -> T) throws -> T {
    let (folder, _) = try resolve(bookmark)
    let ok = folder.startAccessingSecurityScopedResource()
    defer { if ok { folder.stopAccessingSecurityScopedResource() } }
    return try body(folder)
  }
}
