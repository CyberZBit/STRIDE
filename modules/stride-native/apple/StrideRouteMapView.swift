import ExpoModulesCore
import MapKit
import UIKit

final class StrideRouteMapView: ExpoView, MKMapViewDelegate {
  private let map = MKMapView()
  private var points: [[Double]] = []
  private var needsRender = false
  private var renderedLive: Bool?
  private var fitted = false
  private var renderedOverview = 0
  private var routeBounds = MKMapRect.null
  private let accent = UIColor(red: 1, green: 121.0 / 255, blue: 56.0 / 255, alpha: 1)
  var isLive = false
  var overviewRequest = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    map.overrideUserInterfaceStyle = .dark
    map.isPitchEnabled = false
    map.delegate = self
    let configuration = MKStandardMapConfiguration(elevationStyle: .flat, emphasisStyle: .muted)
    configuration.pointOfInterestFilter = .excludingAll
    map.preferredConfiguration = configuration
    addSubview(map)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    map.frame = bounds
    if !fitted { fitRoute(animated: false) }
  }

  func setPoints(_ points: [[Double]]) {
    self.points = points
    needsRender = true
  }

  func render() {
    var latestCoordinate: CLLocationCoordinate2D?
    if needsRender || renderedLive != isLive {
      needsRender = false
      renderedLive = isLive
      var segments: [[CLLocationCoordinate2D]] = []
      for point in points where point.count == 3 {
        let coordinate = CLLocationCoordinate2D(latitude: point[0], longitude: point[1])
        guard CLLocationCoordinate2DIsValid(coordinate) else { continue }
        if segments.isEmpty || point[2] == 1 { segments.append([]) }
        segments[segments.count - 1].append(coordinate)
      }

      map.removeOverlays(map.overlays)
      map.removeAnnotations(map.annotations)
      routeBounds = .null
      for segment in segments {
        for coordinate in segment {
          let point = MKMapPoint(coordinate)
          routeBounds = routeBounds.union(MKMapRect(x: point.x, y: point.y, width: 1, height: 1))
        }
        if segment.count > 1 {
          map.addOverlay(MKPolyline(coordinates: segment, count: segment.count), level: .aboveRoads)
        }
      }
      if let start = segments.first?.first {
        addMarker(at: start, title: "Start")
        if points.count > 1, let last = segments.last?.last {
          latestCoordinate = last
          addMarker(at: last, title: isLive ? "Last GPS fix" : "End")
        }
      }
    }
    if !fitted || overviewRequest != renderedOverview {
      let animated = fitted
      renderedOverview = overviewRequest
      fitRoute(animated: animated)
    } else if isLive, let latestCoordinate {
      let visible = map.visibleMapRect
      let inner = visible.insetBy(dx: visible.width * 0.15, dy: visible.height * 0.15)
      if !inner.contains(MKMapPoint(latestCoordinate)) {
        map.setCenter(latestCoordinate, animated: true)
      }
    }
  }

  private func fitRoute(animated: Bool) {
    guard !routeBounds.isNull, map.bounds.width > 0, map.bounds.height > 0 else { return }
    let center = MKMapPoint(x: routeBounds.midX, y: routeBounds.midY)
    let minimumWidth = 120 * MKMapPointsPerMeterAtLatitude(center.coordinate.latitude)
    let width = max(routeBounds.width, minimumWidth)
    let height = max(routeBounds.height, minimumWidth)
    let padded = MKMapRect(x: center.x - width / 2, y: center.y - height / 2, width: width, height: height)
    map.setVisibleMapRect(
      padded, edgePadding: UIEdgeInsets(top: 35, left: 35, bottom: 38, right: 35), animated: animated
    )
    fitted = true
  }

  private func addMarker(at coordinate: CLLocationCoordinate2D, title: String) {
    let annotation = MKPointAnnotation()
    annotation.coordinate = coordinate
    annotation.title = title
    map.addAnnotation(annotation)
  }

  func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
    guard let route = overlay as? MKPolyline else { return MKOverlayRenderer(overlay: overlay) }
    let renderer = MKPolylineRenderer(polyline: route)
    renderer.strokeColor = accent
    renderer.lineWidth = 5
    renderer.lineCap = .round
    renderer.lineJoin = .round
    return renderer
  }

  func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    let title = (annotation as? MKPointAnnotation)?.title
    let marker = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: nil)
    marker.canShowCallout = true
    marker.markerTintColor = title == "Start" ? .systemGreen : title == "End" ? .systemRed : accent
    marker.glyphImage = UIImage(systemName: title == "Start" ? "play.fill" : title == "End" ? "flag.fill" : "location.fill")
    return marker
  }
}
