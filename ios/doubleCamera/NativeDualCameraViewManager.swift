// React Native 桥接入口：创建相机视图，并将拍照、对焦和录像请求转交给视图处理。
import AVFoundation
import React
import UIKit

@objc(NativeDualCameraViewManager)
final class NativeDualCameraViewManager: RCTViewManager {
  private weak var currentView: NativeDualCameraView?
  static let ciContext = CIContext(options: [
    .useSoftwareRenderer: false, .priorityRequestLow: false,
  ])
  static let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!

  override static func requiresMainQueueSetup() -> Bool { true }

  override func view() -> UIView! {
    let view = NativeDualCameraView()
    currentView = view
    return view
  }

  @objc(capturePhoto:resolver:rejecter:)
  /// 将 JS 拍照请求转交给当前相机视图。
  func capturePhoto(
    options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let view = currentView else {
      reject("native_camera_view_unavailable", "原生相机视图不可用。", nil)
      return
    }
    view.capturePhoto(options: options, resolver: resolve, rejecter: reject)
  }

  @objc(focusPrimaryAtPoint:resolver:rejecter:)
  /// 将触摸坐标转换和对焦请求交给当前相机视图。
  func focusPrimaryAtPoint(
    options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let view = currentView else {
      reject("native_camera_view_unavailable", "原生相机视图不可用。", nil)
      return
    }
    view.focusPrimaryAtPoint(options: options, resolver: resolve, rejecter: reject)
  }

  @objc(startVideoRecording:resolver:rejecter:)
  /// 启动原生双摄录像，并返回启动结果。
  func startVideoRecording(
    options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let view = currentView else {
      reject("native_camera_view_unavailable", "原生相机视图不可用。", nil)
      return
    }
    view.startVideoRecording(options: options, resolver: resolve, rejecter: reject)
  }

  @objc(stopVideoRecording:rejecter:)
  /// 停止录像、完成文件写入并返回保存结果。
  func stopVideoRecording(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let view = currentView else {
      reject("native_camera_view_unavailable", "原生相机视图不可用。", nil)
      return
    }
    view.stopVideoRecording(resolver: resolve, rejecter: reject)
  }
}
