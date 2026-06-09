import AVFoundation
import MediaPlayer
import React
import UIKit

@objc(VolumeButtonManager)
final class VolumeButtonManager: RCTEventEmitter {
  private var volumeView: MPVolumeView?
  private weak var volumeSlider: UISlider?
  private var observation: NSKeyValueObservation?
  private var lastVolume: Float = AVAudioSession.sharedInstance().outputVolume
  private var hasListeners = false
  private var suppressInitialEvent = true

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["VolumeButtonPressed"]
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
    try? AVAudioSession.sharedInstance().setActive(true)
    lastVolume = AVAudioSession.sharedInstance().outputVolume
    suppressInitialEvent = true

    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      if self.volumeView == nil {
        let volumeView = MPVolumeView(frame: CGRect(x: -100, y: -100, width: 1, height: 1))
        volumeView.alpha = 0.01
        UIApplication.shared.windows.first?.addSubview(volumeView)
        self.volumeView = volumeView
        self.volumeSlider = volumeView.subviews.compactMap { $0 as? UISlider }.first
      }
    }

    observation = AVAudioSession.sharedInstance().observe(
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
      self.volumeSlider?.sendActions(for: .touchUpInside)
      self.lastVolume = AVAudioSession.sharedInstance().outputVolume
    }
  }
}
