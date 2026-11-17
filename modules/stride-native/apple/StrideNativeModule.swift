import ActivityKit
import ExpoModulesCore
import UIKit

public final class StrideNativeModule: Module {
  private let sensors = StrideWalkSensors()

  public func definition() -> ModuleDefinition {
    Name("StrideNative")

    AsyncFunction("startWalkSensors") {
      UIApplication.shared.applicationState == .active && self.sensors.start()
    }.runOnQueue(.main)

    AsyncFunction("drainWalkLocations") { (stop: Bool) -> [String: Any] in
      self.sensors.drain(stop: stop)
    }.runOnQueue(.main)

    AsyncFunction("queryWalkSteps") { (from: Double, to: Double, promise: Promise) in
      self.sensors.querySteps(from: from, to: to) { steps in
        if let steps { promise.resolve(steps) }
        else { promise.resolve(nil) }
      }
    }.runOnQueue(.main)

    AsyncFunction("setWalkActivity") {
      (id: String, timerStartedAt: Double, distance: String, paused: Bool, elapsed: String, promise: Promise) in
      Task { @MainActor in
        let timerStart = Date(timeIntervalSince1970: timerStartedAt / 1000)
        let state = WalkActivityAttributes.ContentState(
          distance: distance, paused: paused, elapsed: elapsed, timerStartedAt: timerStart
        )
        let content = ActivityContent(state: state, staleDate: paused ? nil : Date().addingTimeInterval(90))
        if let existing = Activity<WalkActivityAttributes>.activities.first(where: { $0.attributes.sessionId == id }) {
          await existing.update(content)
        } else if !paused && UIApplication.shared.applicationState == .active
            && ActivityAuthorizationInfo().areActivitiesEnabled {
          do {
            let attributes = WalkActivityAttributes(
              sessionId: id, startedAt: timerStart
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
