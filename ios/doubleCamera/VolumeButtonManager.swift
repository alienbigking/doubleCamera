import AVFoundation
import CoreLocation
import MediaPlayer
import React
import UIKit

@objc(VolumeButtonManager)
final class VolumeButtonManager: RCTEventEmitter, CLLocationManagerDelegate {
  private var volumeView: MPVolumeView?
  private weak var volumeSlider: UISlider?
  private var observation: NSKeyValueObservation?
  private var lastVolume: Float = AVAudioSession.sharedInstance().outputVolume
  private var hasListeners = false
  private var suppressInitialEvent = true
  private var locationManager: CLLocationManager?
  private var locationResolver: RCTPromiseResolveBlock?
  private var locationRejecter: RCTPromiseRejectBlock?

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["VolumeButtonPressed"]
  }

  @objc(prepareRecordingAudio:sampleRate:resolver:rejecter:)
  func prepareRecordingAudio(
    _ channelCount: NSNumber,
    sampleRate: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let audioSession = AVAudioSession.sharedInstance()

    do {
      try audioSession.setCategory(.playAndRecord, options: [.defaultToSpeaker, .allowBluetooth])
      try audioSession.setMode(.videoRecording)
      try audioSession.setPreferredSampleRate(sampleRate.doubleValue)

      let requestedChannels = max(1, channelCount.intValue)
      let maxAvailableChannels =
        audioSession.availableInputs?
        .compactMap(\.channels?.count)
        .max() ?? requestedChannels
      let appliedChannels = min(requestedChannels, max(1, maxAvailableChannels))
      try audioSession.setPreferredInputNumberOfChannels(appliedChannels)
      try audioSession.setActive(true)

      resolve(appliedChannels)
    } catch {
      reject("audio_prepare_failed", error.localizedDescription, error)
    }
  }

  @objc(requestCurrentLocation:rejecter:)
  func requestCurrentLocation(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.locationResolver = resolve
      self.locationRejecter = reject

      let manager = self.locationManager ?? CLLocationManager()
      manager.delegate = self
      manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
      self.locationManager = manager

      switch manager.authorizationStatus {
      case .authorizedAlways, .authorizedWhenInUse:
        manager.requestLocation()
      case .notDetermined:
        manager.requestWhenInUseAuthorization()
      case .restricted, .denied:
        reject("location_denied", "Location permission denied.", nil)
        self.locationResolver = nil
        self.locationRejecter = nil
      @unknown default:
        reject("location_unavailable", "Location permission is unavailable.", nil)
        self.locationResolver = nil
        self.locationRejecter = nil
      }
    }
  }

  override func startObserving() {
    hasListeners = true
    setupVolumeObserver()
  }

  override func stopObserving() {
    hasListeners = false
    observation?.invalidate()
    observation = nil
    volumeView?.removeFromSuperview()
    volumeView = nil
  }

  private func setupVolumeObserver() {
    let audioSession = AVAudioSession.sharedInstance()
    try? audioSession.setCategory(.ambient, options: [.mixWithOthers])
    try? audioSession.setActive(true)
    lastVolume = audioSession.outputVolume
    suppressInitialEvent = true

    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      if self.volumeView == nil {
        let volumeView = MPVolumeView(frame: CGRect(x: -100, y: -100, width: 1, height: 1))
        volumeView.alpha = 0.01
        self.hostViewForVolumeObserver()?.addSubview(volumeView)
        self.volumeView = volumeView
        self.volumeSlider = volumeView.subviews.compactMap { $0 as? UISlider }.first
        self.volumeSlider?.setValue(0.5, animated: false)
        self.volumeSlider?.sendActions(for: .valueChanged)
        self.lastVolume = audioSession.outputVolume
      }
    }

    observation = audioSession.observe(
      \.outputVolume,
      options: [.new]
    ) { [weak self] session, _ in
      guard let self else { return }
      let nextVolume = session.outputVolume

      if self.suppressInitialEvent {
        self.suppressInitialEvent = false
        self.lastVolume = nextVolume
        return
      }

      guard self.hasListeners, abs(nextVolume - self.lastVolume) > 0.001 else {
        self.lastVolume = nextVolume
        return
      }

      let direction = nextVolume > self.lastVolume ? "up" : "down"
      self.lastVolume = nextVolume
      self.sendEvent(withName: "VolumeButtonPressed", body: ["direction": direction])
      self.resetVolumeSliderIfNeeded()
    }
  }

  private func resetVolumeSliderIfNeeded() {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { [weak self] in
      guard let self, self.hasListeners else { return }

      self.suppressInitialEvent = true
      self.volumeSlider?.setValue(0.5, animated: false)
      self.volumeSlider?.sendActions(for: .valueChanged)
      self.lastVolume = AVAudioSession.sharedInstance().outputVolume
    }
  }

  private func hostViewForVolumeObserver() -> UIView? {
    if #available(iOS 13.0, *) {
      let scenes = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .filter { $0.activationState == .foregroundActive }

      for scene in scenes {
        if let keyWindow = scene.windows.first(where: \.isKeyWindow) {
          return keyWindow
        }
      }

      return scenes.first?.windows.first
    }

    return UIApplication.shared.keyWindow
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard locationResolver != nil || locationRejecter != nil else { return }

    switch manager.authorizationStatus {
    case .authorizedAlways, .authorizedWhenInUse:
      manager.requestLocation()
    case .restricted, .denied:
      locationRejecter?("location_denied", "Location permission denied.", nil)
      locationResolver = nil
      locationRejecter = nil
    case .notDetermined:
      break
    @unknown default:
      locationRejecter?("location_unavailable", "Location permission is unavailable.", nil)
      locationResolver = nil
      locationRejecter = nil
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    locationRejecter?("location_failed", error.localizedDescription, error)
    locationResolver = nil
    locationRejecter = nil
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else {
      locationRejecter?("location_failed", "No location fix available.", nil)
      locationResolver = nil
      locationRejecter = nil
      return
    }

    locationResolver?([
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude,
      "altitude": location.altitude,
      "horizontalAccuracy": location.horizontalAccuracy,
      "verticalAccuracy": location.verticalAccuracy,
      "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
      "isMock": false,
    ])
    locationResolver = nil
    locationRejecter = nil
  }
}
