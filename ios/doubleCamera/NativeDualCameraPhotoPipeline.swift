// 原生拍照管线：预热图像编码、规范化双摄帧并合成为本地 JPEG 文件。
import AVFoundation
import CoreImage
import Foundation
import ImageIO
import React

extension NativeDualCameraView {
  /// 提前初始化 Core Image 渲染和 JPEG 编码，减少首次拍照等待。
  func prewarmProcessingPipelineIfNeeded() {
    guard !hasPrewarmedProcessing else { return }
    hasPrewarmedProcessing = true

    var pixelBuffer: CVPixelBuffer?
    let attributes: [String: Any] = [
      kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
      kCVPixelBufferWidthKey as String: 8,
      kCVPixelBufferHeightKey as String: 8,
      kCVPixelBufferIOSurfacePropertiesKey as String: [:],
    ]

    let status = CVPixelBufferCreate(
      kCFAllocatorDefault,
      8,
      8,
      kCVPixelFormatType_32BGRA,
      attributes as CFDictionary,
      &pixelBuffer
    )
    guard status == kCVReturnSuccess, let pixelBuffer else { return }

    let warmImage = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 1))
      .cropped(to: CGRect(x: 0, y: 0, width: 8, height: 8))
    NativeDualCameraViewManager.ciContext.render(warmImage, to: pixelBuffer)

    // 在相机预热期间提前初始化 JPEG 编码，降低首次拍照延迟。
    let warmURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("native-dualcam-warmup-(UUID().uuidString).jpg")
    try? NativeDualCameraViewManager.ciContext.writeJPEGRepresentation(
      of: warmImage,
      to: warmURL,
      colorSpace: NativeDualCameraViewManager.colorSpace,
      options: [
        kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.5
      ]
    )
    try? FileManager.default.removeItem(at: warmURL)
  }

  /// 统一图像方向和原点，供预览截图与合成逻辑使用。
  func normalizedImage(from pixelBuffer: CVPixelBuffer, mirrored: Bool) -> CIImage {
    let rawImage = CIImage(cvPixelBuffer: pixelBuffer)
    var image = rawImage
    if rawImage.extent.width > rawImage.extent.height {
      image = rawImage.oriented(.right)
    }
    if mirrored {
      let mirror = CGAffineTransform(scaleX: -1, y: 1)
        .translatedBy(x: -image.extent.width, y: 0)
      image = image.transformed(by: mirror)
    }
    let extent = image.extent
    return image.transformed(
      by: CGAffineTransform(translationX: -extent.minX, y: -extent.minY)
    )
  }
  /// 从最近一帧双摄画面生成合成照片，并通过本地文件 URI 返回 JS。
  func capturePhoto(
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isConfigured, self.isRunning else {
        reject("native_camera_not_ready", "原生相机尚未准备好。", nil)
        return
      }

      let rearBuffer = self.latestRearPixelBuffer
      let frontBuffer = self.latestFrontPixelBuffer

      guard let rearBuffer else {
        reject("native_camera_rear_frame_missing", "后置相机画面暂不可用。", nil)
        return
      }

      if self.isDualCameraActive && frontBuffer == nil {
        reject("native_camera_front_frame_missing", "前置相机画面暂不可用。", nil)
        return
      }

      do {
        let result = try autoreleasepool {
          try self.composePhoto(
            rearBuffer: rearBuffer,
            frontBuffer: frontBuffer,
            options: options
          )
        }
        resolve([
          "combinedUri": result.absoluteString
        ])
      } catch {
        reject("native_camera_capture_failed", error.localizedDescription, error)
      }
    }
  }

  /// 按当前布局和画质参数合成双摄画面并写入 JPEG 临时文件。
  func composePhoto(
    rearBuffer: CVPixelBuffer,
    frontBuffer: CVPixelBuffer?,
    options: NSDictionary
  ) throws -> URL {
    let layout = (options["layout"] as? String) ?? "pip"
    let primaryCamera = (options["primaryCamera"] as? String) ?? "rear"
    let pipX = CGFloat(truncating: options["pipX"] as? NSNumber ?? 0)
    let pipY = CGFloat(truncating: options["pipY"] as? NSNumber ?? 0)
    let pipWidth = CGFloat(truncating: options["pipWidth"] as? NSNumber ?? 142)
    let pipHeight = CGFloat(truncating: options["pipHeight"] as? NSNumber ?? 184)
    let previewWidth = CGFloat(
      truncating: options["previewWidth"] as? NSNumber
        ?? NSNumber(value: Double(max(bounds.width, 1))))
    let previewHeight = CGFloat(
      truncating: options["previewHeight"] as? NSNumber
        ?? NSNumber(value: Double(max(bounds.height, 1))))
    let aspectRatio = CGFloat(truncating: options["aspectRatio"] as? NSNumber ?? 0)
    let maxLongSide = CGFloat(truncating: options["maxLongSide"] as? NSNumber ?? 2560)
    let jpegQuality = CGFloat(truncating: options["jpegQuality"] as? NSNumber ?? 92)
    let pipBorderVisible = options["pipBorderVisible"] as? Bool ?? true

    let rearImage = normalizedImage(from: rearBuffer, mirrored: false)
    let frontImage = normalizedImage(from: frontBuffer ?? rearBuffer, mirrored: false)
    let primaryImage = primaryCamera == "front" ? frontImage : rearImage
    let secondaryImage = primaryCamera == "front" ? rearImage : frontImage
    let outputSize = outputSize(
      for: primaryImage.extent.size,
      aspectRatio: aspectRatio,
      maxLongSide: maxLongSide
    )
    guard outputSize.width > 0, outputSize.height > 0 else {
      throw composerError("照片输出尺寸无效。")
    }

    let outputRect = CGRect(origin: .zero, size: outputSize)
    let composedImage: CIImage

    if layout == "split", isDualCameraActive {
      let topRect = ciRect(
        fromTopLeft: CGRect(x: 0, y: 0, width: outputSize.width, height: outputSize.height / 2),
        outputSize: outputSize
      )
      let bottomRect = ciRect(
        fromTopLeft: CGRect(
          x: 0, y: outputSize.height / 2, width: outputSize.width, height: outputSize.height / 2),
        outputSize: outputSize
      )
      let primaryLayer = aspectFill(primaryImage, in: topRect)
      let secondaryLayer = aspectFill(secondaryImage, in: bottomRect)
      composedImage = secondaryLayer.composited(over: primaryLayer).cropped(to: outputRect)
    } else {
      let mainLayer = aspectFill(primaryImage, in: outputRect)
      let mappedPip = mapPipRect(
        CGRect(x: pipX, y: pipY, width: pipWidth, height: pipHeight),
        from: CGSize(width: previewWidth, height: previewHeight),
        to: outputSize
      )
      let insetRect = ciRect(fromTopLeft: mappedPip, outputSize: outputSize)
      composedImage = renderPip(
        image: secondaryImage,
        over: mainLayer,
        in: insetRect,
        outputSize: outputSize,
        previewSize: CGSize(width: previewWidth, height: previewHeight),
        pipBorderVisible: pipBorderVisible
      ).cropped(to: outputRect)
    }

    let outputURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("native-dualcam-\(UUID().uuidString).jpg")
    let compressionQuality = min(max(jpegQuality / 100, 0.1), 1)
    try NativeDualCameraViewManager.ciContext.writeJPEGRepresentation(
      of: composedImage,
      to: outputURL,
      colorSpace: NativeDualCameraViewManager.colorSpace,
      options: [
        kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption:
          compressionQuality
      ]
    )
    return outputURL
  }
}
