import SwiftUI
import WidgetKit

@main
struct SundaySortWidgetBundle: WidgetBundle {
  var body: some Widget {
    QuickAddWidget()
    WeekWidget()
  }
}
