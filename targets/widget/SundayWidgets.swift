import SwiftUI
import WidgetKit

// MARK: - Shared data (written by the app: src/features/widgets/refresh.ts)

private let appGroup = "group.com.phiotron.sundaysort"
private let snapshotKey = "widgetSnapshot"

struct WidgetSnapshot {
  var ready: Bool
  var toSort: Int
  var toSortText: String
  var netText: String
  var weekLine: String
  /// "none" | "running" | "paused"
  var trip: String
  var tripDistance: String
  /// Bản 2: "off" | "on" | "paused" → "Auto trips on" (green dot) / "Auto trips paused" (orange)
  var auto: String
  var autoText: String

  static func load() -> WidgetSnapshot {
    let d = UserDefaults(suiteName: appGroup)?.dictionary(forKey: snapshotKey) ?? [:]
    func str(_ k: String) -> String { d[k] as? String ?? "" }
    func int(_ k: String) -> Int { (d[k] as? NSNumber)?.intValue ?? 0 }
    return WidgetSnapshot(
      ready: int("ready") == 1,
      toSort: int("toSort"),
      toSortText: str("toSortText"),
      netText: str("netText"),
      weekLine: str("weekLine"),
      trip: str("trip").isEmpty ? "none" : str("trip"),
      tripDistance: str("tripDistance"),
      auto: str("auto").isEmpty ? "off" : str("auto"),
      autoText: str("autoText")
    )
  }

  static let preview = WidgetSnapshot(
    ready: true, toSort: 14, toSortText: "14 to sort", netText: "£1,053.60",
    weekLine: "This week: Net £1,053.60 · 14 to sort", trip: "none", tripDistance: "",
    auto: "on", autoText: "Auto trips on"
  )
}

struct SnapshotEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
}

struct SnapshotProvider: TimelineProvider {
  func placeholder(in context: Context) -> SnapshotEntry {
    SnapshotEntry(date: Date(), snapshot: .preview)
  }

  func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
    completion(SnapshotEntry(date: Date(), snapshot: context.isPreview ? .preview : .load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
    // The app reloads timelines whenever data changes; this refresh only rolls the week over.
    let entry = SnapshotEntry(date: Date(), snapshot: .load())
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
  }
}

// MARK: - Theme (design/screens/13-system__s-14__ios-*.html)

extension Color {
  init(hex: UInt32) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: 1
    )
  }
}

struct Skin {
  let bg, text, muted, tagBg, tagFg, expBg, expFg, incBg, incFg, tripBg, tripFg, runBg, runFg, runDot, glyph: Color

  static func of(_ scheme: ColorScheme) -> Skin {
    scheme == .dark
      ? Skin(
        bg: Color(hex: 0x1F2632), text: Color(hex: 0xF3EFE7), muted: Color(hex: 0xBEC4CE),
        tagBg: Color(hex: 0x3A3122), tagFg: Color(hex: 0xF7CD71),
        expBg: Color(hex: 0xF29A84), expFg: Color(hex: 0x3A1209),
        incBg: Color(hex: 0x5FD39A), incFg: Color(hex: 0x06251A),
        tripBg: Color(hex: 0x26324F), tripFg: .white,
        runBg: Color(hex: 0xF5B841), runFg: Color(hex: 0x12161C), runDot: Color(hex: 0xC2281C),
        glyph: Color(hex: 0x26324F))
      : Skin(
        bg: Color(hex: 0xFAF8F4), text: Color(hex: 0x161D2B), muted: Color(hex: 0x465062),
        tagBg: Color(hex: 0xFDF0D3), tagFg: Color(hex: 0x6B4A00),
        expBg: Color(hex: 0x93371F), expFg: .white,
        incBg: Color(hex: 0x0F5C39), incFg: .white,
        tripBg: Color(hex: 0x1F2A44), tripFg: .white,
        runBg: Color(hex: 0xF5B841), runFg: Color(hex: 0x1F2A44), runDot: Color(hex: 0xC2281C),
        glyph: Color(hex: 0x1F2A44))
  }
}

private enum Links {
  static let expense = URL(string: "sundaysort://capture?type=expense")!
  static let income = URL(string: "sundaysort://capture?type=income")!
  static let startTrip = URL(string: "sundaysort://trip/active?start=1")!
  static let endTrip = URL(string: "sundaysort://trip/active?action=end")!
  static let sort = URL(string: "sundaysort://sort")!
  static let open = URL(string: "sundaysort://")!
}

// MARK: - Pieces

struct AppGlyph: View {
  let color: Color
  var body: some View {
    ZStack(alignment: .topTrailing) {
      RoundedRectangle(cornerRadius: 6, style: .continuous).fill(color)
      Circle().fill(Color(hex: 0xF5B841)).frame(width: 7, height: 7).offset(x: -4, y: 4)
    }
    .frame(width: 22, height: 22)
    .accessibilityHidden(true)
  }
}

struct SortTag: View {
  let text: String
  let skin: Skin
  var body: some View {
    Text(text)
      .font(.system(size: 12, weight: .bold))
      .foregroundStyle(skin.tagFg)
      .padding(.horizontal, 9)
      .frame(height: 24)
      .background(Capsule().fill(skin.tagBg))
      .lineLimit(1)
  }
}

struct ActionTile<Label: View>: View {
  let url: URL
  let bg: Color
  let a11y: String
  @ViewBuilder let label: () -> Label
  var body: some View {
    Link(destination: url) {
      label()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(bg))
    }
    .accessibilityLabel(a11y)
  }
}

struct SetupView: View {
  let skin: Skin
  var body: some View {
    Text("Open Sunday Sort to set up")
      .font(.system(size: 14, weight: .semibold))
      .foregroundStyle(skin.muted)
      .multilineTextAlignment(.center)
      .widgetURL(Links.open)
  }
}

// MARK: - Small: − / + and "14 to sort"

struct QuickAddView: View {
  @Environment(\.colorScheme) private var scheme
  let entry: SnapshotEntry
  var body: some View {
    let skin = Skin.of(scheme)
    let s = entry.snapshot
    Group {
      if !s.ready {
        SetupView(skin: skin)
      } else {
        VStack(spacing: 8) {
          HStack {
            AppGlyph(color: skin.glyph)
            Spacer(minLength: 4)
            SortTag(text: s.toSortText, skin: skin)
          }
          if s.auto != "off" {
            HStack(spacing: 6) {
              Circle()
                .fill(s.auto == "on" ? Color(hex: scheme == .dark ? 0x4FBF8A : 0x2F8A5F) : Color(hex: scheme == .dark ? 0xF0A04B : 0xD9822B))
                .frame(width: 8, height: 8)
              Text(s.autoText)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(skin.muted)
                .lineLimit(1)
              Spacer(minLength: 0)
            }
          }
          HStack(spacing: 8) {
            ActionTile(url: Links.expense, bg: skin.expBg, a11y: "New expense") {
              Text("−").font(.system(size: 30, weight: .bold)).foregroundStyle(skin.expFg)
            }
            ActionTile(url: Links.income, bg: skin.incBg, a11y: "New income") {
              Text("+").font(.system(size: 30, weight: .bold)).foregroundStyle(skin.incFg)
            }
          }
        }
        // Small widgets are one tap target on some iOS versions: fall back to a new expense.
        .widgetURL(Links.expense)
      }
    }
    .containerBackground(skin.bg, for: .widget)
  }
}

// MARK: - Medium: week line + − Expense · + Income · Start trip / End trip

struct WeekView: View {
  @Environment(\.colorScheme) private var scheme
  let entry: SnapshotEntry
  var body: some View {
    let skin = Skin.of(scheme)
    let s = entry.snapshot
    Group {
      if !s.ready {
        SetupView(skin: skin)
      } else {
        VStack(spacing: 10) {
          HStack {
            (Text("This week: Net ").foregroundStyle(skin.muted) + Text(s.netText).foregroundStyle(skin.text))
              .font(.system(size: 13, weight: .bold))
              .lineLimit(1)
            Spacer(minLength: 4)
            SortTag(text: s.toSortText, skin: skin)
          }
          HStack(spacing: 8) {
            ActionTile(url: Links.expense, bg: skin.expBg, a11y: "New expense") {
              Text("− Expense").font(.system(size: 15, weight: .bold)).foregroundStyle(skin.expFg).lineLimit(1).minimumScaleFactor(0.8)
            }
            ActionTile(url: Links.income, bg: skin.incBg, a11y: "New income") {
              Text("+ Income").font(.system(size: 15, weight: .bold)).foregroundStyle(skin.incFg).lineLimit(1).minimumScaleFactor(0.8)
            }
            if s.trip == "none" {
              ActionTile(url: Links.startTrip, bg: skin.tripBg, a11y: "Start trip") {
                VStack(spacing: 2) {
                  Image(systemName: "flag").font(.system(size: 14, weight: .bold))
                  Text("Start trip").font(.system(size: 15, weight: .bold)).lineLimit(1).minimumScaleFactor(0.8)
                }
                .foregroundStyle(skin.tripFg)
              }
            } else {
              ActionTile(url: Links.endTrip, bg: skin.runBg, a11y: "End trip, \(s.tripDistance)") {
                VStack(spacing: 0) {
                  HStack(spacing: 5) {
                    Circle().fill(skin.runDot).frame(width: 8, height: 8)
                    Text("End trip").font(.system(size: 14, weight: .bold))
                  }
                  Text(s.tripDistance).font(.system(size: 16, weight: .heavy)).monospacedDigit()
                }
                .foregroundStyle(skin.runFg)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
              }
              .layoutPriority(1)
            }
          }
        }
      }
    }
    .containerBackground(skin.bg, for: .widget)
  }
}

// MARK: - Widgets

struct QuickAddWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "SundayQuick", provider: SnapshotProvider()) { entry in
      QuickAddView(entry: entry)
    }
    .configurationDisplayName("Quick add")
    .description("Add an expense or income in one tap.")
    .supportedFamilies([.systemSmall])
  }
}

struct WeekWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "SundayWeek", provider: SnapshotProvider()) { entry in
      WeekView(entry: entry)
    }
    .configurationDisplayName("Week & trip")
    .description("This week's net, entries to sort and a trip button.")
    .supportedFamilies([.systemMedium])
  }
}
