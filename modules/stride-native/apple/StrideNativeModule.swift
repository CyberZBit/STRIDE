import ActivityKit
import ExpoModulesCore
import UIKit

public final class StrideNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StrideNative")

    AsyncFunction("setWalkActivity") {
      (id: String, startedAt: Double, distance: String, paused: Bool, elapsed: String, promise: Promise) in
      Task { @MainActor in
        let state = WalkActivityAttributes.ContentState(distance: distance, paused: paused, elapsed: elapsed)
        let content = ActivityContent(state: state, staleDate: paused ? nil : Date().addingTimeInterval(90))
        if let existing = Activity<WalkActivityAttributes>.activities.first(where: { $0.attributes.sessionId == id }) {
          await existing.update(content)
        } else if !paused && UIApplication.shared.applicationState == .active
            && ActivityAuthorizationInfo().areActivitiesEnabled {
          do {
            let attributes = WalkActivityAttributes(
              sessionId: id, startedAt: Date(timeIntervalSince1970: startedAt / 1000)
            )
            _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
          } catch {
            promise.reject(error)
            return
          }
        }
        promise.resolve(nil)
      }
    }

    AsyncFunction("clearWalkActivities") { (promise: Promise) in
      Task { @MainActor in
        for activity in Activity<WalkActivityAttributes>.activities {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
        promise.resolve(nil)
      }
    }

    View(StrideRouteMapView.self) {
      Prop("points") { (view: StrideRouteMapView, points: [[Double]]) in
        view.setPoints(points)
      }
      Prop("live") { (view: StrideRouteMapView, live: Bool) in
        view.isLive = live
      }
      Prop("overviewRequest") { (view: StrideRouteMapView, request: Int) in
        view.overviewRequest = request
      }
      OnViewDidUpdateProps { (view: StrideRouteMapView) in
        view.render()
      }
    }
  }
}
