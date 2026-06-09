import React
import UIKit

@objc(NativeBlurViewManager)
final class NativeBlurViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    NativeBlurView()
  }
}

final class NativeBlurView: UIView {
  private let blurView = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialDark))

  @objc var blurStyle: String = "systemUltraThinMaterialDark" {
    didSet {
      blurView.effect = UIBlurEffect(style: effectStyle(for: blurStyle))
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    backgroundColor = .clear
    blurView.frame = bounds
    blurView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    blurView.isUserInteractionEnabled = false
    addSubview(blurView)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  private func effectStyle(for style: String) -> UIBlurEffect.Style {
    switch style {
    case "light":
      return .light
    case "dark":
      return .dark
    case "regular":
      return .regular
    case "prominent":
      return .prominent
    case "systemThinMaterialDark":
      return .systemThinMaterialDark
    case "systemMaterialDark":
      return .systemMaterialDark
    default:
      return .systemUltraThinMaterialDark
    }
  }
}
