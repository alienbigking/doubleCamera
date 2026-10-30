// 原生预览布局：按画中画或分屏模式定位容器，并挂接对应相机预览层。
import AVFoundation
import React
import UIKit

extension NativeDualCameraView {
  /// 将布局属性变更安全地派发到主线程。
  func scheduleLayoutUpdate() {
    DispatchQueue.main.async { [weak self] in
      self?.applyLayout()
    }
  }

  /// 根据当前模式、主摄和小窗参数更新预览容器布局。
  func applyLayout() {
    guard Thread.isMainThread else {
      scheduleLayoutUpdate()
      return
    }

    CATransaction.begin()
    CATransaction.setDisableActions(true)

    primaryContainer.frame = bounds
    splitDivider.isHidden = true

    let showingSplit = isDualCameraActive && layoutModeString == "split"
    let showingSecondary = isDualCameraActive

    if showingSplit {
      let dividerHeight: CGFloat = 2
      let primaryHeight = max(0, floor((bounds.height - dividerHeight) / 2))
      primaryContainer.frame = CGRect(x: 0, y: 0, width: bounds.width, height: primaryHeight)
      splitDivider.frame = CGRect(
        x: 0, y: primaryHeight, width: bounds.width, height: dividerHeight)
      secondaryContainer.frame = CGRect(
        x: 0,
        y: primaryHeight + dividerHeight,
        width: bounds.width,
        height: max(0, bounds.height - primaryHeight - dividerHeight)
      )
      splitDivider.isHidden = false
      secondaryContainer.isHidden = false
      secondaryContainer.layer.cornerRadius = 0
      secondaryContainer.layer.borderWidth = 0
    } else if showingSecondary {
      let width = max(1, CGFloat(truncating: pipWidth))
      let height = max(1, CGFloat(truncating: pipHeight))
      let maxX = max(0, bounds.width - width)
      let maxY = max(0, bounds.height - height)
      let x = min(max(0, CGFloat(truncating: pipX)), maxX)
      let y = min(max(0, CGFloat(truncating: pipY)), maxY)
      secondaryContainer.frame = CGRect(x: x, y: y, width: width, height: height)
      secondaryContainer.isHidden = false
      secondaryContainer.layer.cornerRadius = 28
      secondaryContainer.layer.borderWidth = pipBorderVisible ? 2 : 0
      secondaryContainer.layer.borderColor = UIColor.black.withAlphaComponent(0.32).cgColor
    } else {
      secondaryContainer.isHidden = true
      secondaryContainer.layer.borderWidth = 0
      secondaryContainer.layer.cornerRadius = 0
    }

    attachPreviewLayers()
    CATransaction.commit()
  }

  /// 将主摄和副摄预览层挂到对应容器并更新图层尺寸。
  func attachPreviewLayers() {
    let primaryIsRear = primaryCameraString != "front"
    let primaryLayer = primaryIsRear ? rearPreviewLayer : frontPreviewLayer
    let secondaryLayer = primaryIsRear ? frontPreviewLayer : rearPreviewLayer

    if let primaryLayer {
      if primaryLayer.superlayer !== primaryContainer.layer {
        primaryLayer.removeFromSuperlayer()
        primaryContainer.layer.insertSublayer(primaryLayer, at: 0)
      }
      primaryLayer.frame = primaryContainer.bounds
    }

    guard isDualCameraActive, let secondaryLayer else {
      rearPreviewLayer?.frame = primaryContainer.bounds
      frontPreviewLayer?.removeFromSuperlayer()
      return
    }

    if secondaryLayer.superlayer !== secondaryContainer.layer {
      secondaryLayer.removeFromSuperlayer()
      secondaryContainer.layer.insertSublayer(secondaryLayer, at: 0)
    }
    secondaryLayer.frame = secondaryContainer.bounds
  }

  var layoutModeString: String {
    layoutMode.lowercased.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  var primaryCameraString: String {
    primaryCamera.lowercased.trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
