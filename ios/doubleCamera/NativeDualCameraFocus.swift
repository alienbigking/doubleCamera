// 原生对焦处理：将主画面触摸坐标映射到相机坐标并设置自动对焦和曝光。
import AVFoundation
import React
import UIKit

extension NativeDualCameraView {
  /// 将屏幕触点转换为主摄设备坐标，并应用相机支持的对焦/曝光模式。
  func focusPrimaryAtPoint(
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let x = CGFloat(truncating: options["x"] as? NSNumber ?? 0)
    let y = CGFloat(truncating: options["y"] as? NSNumber ?? 0)

    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isConfigured, self.isRunning else {
        reject("native_camera_not_ready", "原生相机尚未准备好。", nil)
        return
      }

      let primaryIsFront = self.primaryCameraString == "front"
      let deviceInput = primaryIsFront ? self.frontDeviceInput : self.rearDeviceInput
      let previewLayer = primaryIsFront ? self.frontPreviewLayer : self.rearPreviewLayer

      guard let device = deviceInput?.device, let previewLayer else {
        reject("native_camera_focus_unavailable", "主摄当前无法对焦。", nil)
        return
      }

      var focusPoint = CGPoint.zero
      var touchInsidePrimary = false
      var primaryBounds = CGRect.zero

      DispatchQueue.main.sync {
        let containerFrame = self.primaryContainer.frame
        primaryBounds = self.primaryContainer.bounds
        let touchPoint = CGPoint(x: x, y: y)
        touchInsidePrimary = containerFrame.contains(touchPoint)
        if touchInsidePrimary {
          let localPoint = CGPoint(
            x: min(max(0, touchPoint.x - containerFrame.minX), self.primaryContainer.bounds.width),
            y: min(max(0, touchPoint.y - containerFrame.minY), self.primaryContainer.bounds.height)
          )
          focusPoint = previewLayer.captureDevicePointConverted(fromLayerPoint: localPoint)
        }
      }

      guard touchInsidePrimary else {
        reject(
          "native_camera_focus_outside_primary", "触点不在主摄画面范围内。", nil)
        return
      }

      do {
        try device.lockForConfiguration()
        defer { device.unlockForConfiguration() }

        var appliedAnyAdjustment = false

        if device.isFocusPointOfInterestSupported {
          device.focusPointOfInterest = focusPoint
          if device.isFocusModeSupported(.continuousAutoFocus) {
            device.focusMode = .continuousAutoFocus
            appliedAnyAdjustment = true
          } else if device.isFocusModeSupported(.autoFocus) {
            device.focusMode = .autoFocus
            appliedAnyAdjustment = true
          }
        }

        if device.isExposurePointOfInterestSupported {
          device.exposurePointOfInterest = focusPoint
          if device.isExposureModeSupported(.continuousAutoExposure) {
            device.exposureMode = .continuousAutoExposure
            appliedAnyAdjustment = true
          } else if device.isExposureModeSupported(.autoExpose) {
            device.exposureMode = .autoExpose
            appliedAnyAdjustment = true
          }
        }

        if device.isSubjectAreaChangeMonitoringEnabled != true {
          device.isSubjectAreaChangeMonitoringEnabled = true
        }

        if !appliedAnyAdjustment {
          NSLog(
            "原生双摄对焦：设备不支持可用的对焦或曝光调整，主摄为前置=%@ 坐标=(%.3f, %.3f) 区域=(%.1f, %.1f)",
            primaryIsFront.description,
            focusPoint.x,
            focusPoint.y,
            primaryBounds.width,
            primaryBounds.height
          )
        }

        resolve(nil)
      } catch {
        NSLog(
          "原生双摄对焦：配置失败，错误=%@ 主摄为前置=%@ 坐标=(%.3f, %.3f) 区域=(%.1f, %.1f)",
          error.localizedDescription,
          primaryIsFront.description,
          focusPoint.x,
          focusPoint.y,
          primaryBounds.width,
          primaryBounds.height
        )
        resolve(nil)
      }
    }
  }
}
