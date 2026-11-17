import CoreLocation
import CoreMotion
import Foundation

final class StrideWalkSensors: NSObject, CLLocationManagerDelegate {
  private var manager: CLLocationManager?
  private let pedometer = CMPedometer()
  private var fixes: [[String: Double]] = []
  private var interrupted = false

  func start() -> Bool {
    guard (Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes") as? [String])?.contains("location") == true
    else { return false }

    let manager = CLLocationManager()
    guard manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways
    else { return false }

    self.manager?.stopUpdatingLocation()
    fixes.removeAll(keepingCapacity: true)
    interrupted = false
    self.manager = manager
    manager.delegate = self
    manager.activityType = .fitness
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.distanceFilter = 3
    manager.pausesLocationUpdatesAutomatically = false
    manager.allowsBackgroundLocationUpdates = true
    manager.showsBackgroundLocationIndicator = true
    manager.startUpdatingLocation()
    return true
  }

  func drain(stop: Bool) -> [String: Any] {
    if stop {
      manager?.stopUpdatingLocation()
      manager = nil
    }
    let batch: [String: Any] = ["fixes": fixes, "interrupted": interrupted]
    fixes.removeAll(keepingCapacity: !stop)
    interrupted = false
    return batch
  }

  func querySteps(from: Double, to: Double, completion: @escaping (Int?) -> Void) {
    guard CMPedometer.isStepCountingAvailable(), to > from else { completion(nil); return }
    pedometer.queryPedometerData(
      from: Date(timeIntervalSince1970: from / 1000),
      to: Date(timeIntervalSince1970: to / 1000)
    ) { data, _ in
      completion(data?.numberOfSteps.intValue)
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard manager === self.manager else { return }
    for location in locations {
      var fix = [
        "latitude": location.coordinate.latitude,
        "longitude": location.coordinate.longitude,
        "accuracy": location.horizontalAccuracy,
        "timestamp": location.timestamp.timeIntervalSince1970 * 1000
      ]
      if location.speed >= 0 { fix["speed"] = location.speed }
      fixes.append(fix)
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    guard manager === self.manager, (error as? CLError)?.code == .denied else { return }
    interrupted = true
    manager.stopUpdatingLocation()
  }
}
