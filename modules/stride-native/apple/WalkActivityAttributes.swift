import ActivityKit
import Foundation

struct WalkActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    let distance: String
    let paused: Bool
    let elapsed: String
  }

  let sessionId: String
  let startedAt: Date
}
