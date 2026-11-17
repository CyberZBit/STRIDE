import ActivityKit
import SwiftUI
import WidgetKit

@main
struct StrideWalkWidget: Widget {
  private let accent = Color(red: 1, green: 121.0 / 255, blue: 56.0 / 255)

  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WalkActivityAttributes.self) { context in
      lockScreen(context)
        .activityBackgroundTint(Color(red: 0.09, green: 0.09, blue: 0.10))
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.bottom) { lockScreen(context) }
      } compactLeading: {
        Image(systemName: "figure.walk").foregroundStyle(accent)
      } compactTrailing: {
        Text(context.state.distance)
      } minimal: {
        Image(systemName: "figure.walk").foregroundStyle(accent)
      }
      .widgetURL(url("open", context))
    }
  }

  private func lockScreen(_ context: ActivityViewContext<WalkActivityAttributes>) -> some View {
    let paused = context.state.paused
    return VStack(alignment: .leading, spacing: 8) {
      HStack {
        Label(context.isStale ? "Open STRIDE to check your walk" : paused ? "Walk paused" : "Walk in session",
              systemImage: "figure.walk")
          .font(.headline)
          .foregroundStyle(accent)
        Spacer(minLength: 0)
        Text("STRIDE").font(.caption.bold()).foregroundStyle(.secondary)
      }
      HStack {
        Text(context.state.distance)
        Spacer()
        if paused || context.isStale {
          Text(context.state.elapsed)
        } else {
          Text(context.state.timerStartedAt ?? context.attributes.startedAt, style: .timer)
            .multilineTextAlignment(.trailing)
        }
      }
      .font(.title3.monospacedDigit().bold())
      HStack(spacing: 20) {
        Link(context.isStale ? "Open STRIDE" : paused ? "Resume" : "Pause",
             destination: url(context.isStale ? "open" : paused ? "resume" : "pause", context))
        Link("End walk", destination: url("end", context))
      }
      .font(.subheadline.weight(.semibold))
      .foregroundStyle(accent)
    }
    .foregroundStyle(.white)
    .padding(16)
    .widgetURL(url("open", context))
  }

  private func url(_ action: String, _ context: ActivityViewContext<WalkActivityAttributes>) -> URL {
    // Session IDs come from SQLite's hex(randomblob(...)).
    URL(string: "stride:///?walkSession=\(context.attributes.sessionId)&walkAction=\(action)")!
  }
}
