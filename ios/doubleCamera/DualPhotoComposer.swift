import React
import CoreImage
import ImageIO

@objc(DualPhotoComposer)
final class DualPhotoComposer: NSObject {
  private static let processingQueue = DispatchQueue(
    label: "com.doubleCamera.dualPhotoComposer",
    qos: .userInitiated
  )
  private static let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
  private static let context = CIContext(options: [
    .useSoftwareRenderer: false,
    .priorityRequestLow: false,
  ])

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(composeDualPhoto:frontPhotoPath:layout:pipX:pipY:pipWidth:pipHeight:previewWidth:previewHeight:aspectRatio:maxLongSide:jpegQuality:primaryCamera:pipBorderVisible:resolver:rejecter:)
  func composeDualPhoto(
    rearPhotoPath: String,
    frontPhotoPath: String,
    layout: String,
    pipX: NSNumber,
    pipY: NSNumber,
    pipWidth: NSNumber,
    pipHeight: NSNumber,
    previewWidth: NSNumber,
    previewHeight: NSNumber,
    aspectRatio: NSNumber,
    maxLongSide: NSNumber,
    jpegQuality: NSNumber,
    primaryCamera: String,
    pipBorderVisible: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.processingQueue.async {
      do {
        let outputURL = try self.compose(
          rearPhotoPath: rearPhotoPath,
          frontPhotoPath: frontPhotoPath,
          layout: layout,
          pipRect: CGRect(
            x: CGFloat(truncating: pipX),
            y: CGFloat(truncating: pipY),
            width: CGFloat(truncating: pipWidth),
            height: CGFloat(truncating: pipHeight)
          ),
          previewSize: CGSize(
            width: CGFloat(truncating: previewWidth),
            height: CGFloat(truncating: previewHeight)
          ),
          aspectRatio: CGFloat(truncating: aspectRatio),
          maxLongSide: CGFloat(truncating: maxLongSide),
          jpegQuality: CGFloat(truncating: jpegQuality),
          primaryCamera: primaryCamera,
          pipBorderVisible: pipBorderVisible
        )
        resolve(outputURL.absoluteString)
      } catch {
        reject("dual_photo_compose_failed", error.localizedDescription, error)
      }
    }
  }

  private func compose(
    rearPhotoPath: String,
    frontPhotoPath: String,
    layout: String,
    pipRect: CGRect,
    previewSize: CGSize,
    aspectRatio: CGFloat,
    maxLongSide: CGFloat,
    jpegQuality: CGFloat,
    primaryCamera: String,
    pipBorderVisible: Bool
  ) throws -> URL {
    try autoreleasepool {
      let primaryPath = primaryCamera == "front" ? frontPhotoPath : rearPhotoPath
      guard let primarySize = probeImageSizeFast(from: primaryPath) else {
        throw composerError("Failed to probe primary photo size.")
      }

      let outputSize = outputSize(
        for: primarySize,
        aspectRatio: aspectRatio,
        maxLongSide: maxLongSide
      )
      guard outputSize.width > 0, outputSize.height > 0 else {
        throw composerError("Invalid output photo size.")
      }

      let targetLongSide = max(outputSize.width, outputSize.height)
      guard let rearImage = loadImageFast(from: rearPhotoPath, maxSide: targetLongSide),
        let frontImage = loadImageFast(from: frontPhotoPath, maxSide: targetLongSide)
      else {
        throw composerError("Failed to load source photos.")
      }

      let primaryImage = primaryCamera == "front" ? frontImage : rearImage
      let secondaryImage = primaryCamera == "front" ? rearImage : frontImage

      let outputRect = CGRect(origin: .zero, size: outputSize)
      let composedImage: CIImage
      if layout == "split" {
        let topRect = ciRect(
          fromTopLeft: CGRect(x: 0, y: 0, width: outputSize.width, height: outputSize.height / 2),
          outputSize: outputSize
        )
        let bottomRect = ciRect(
          fromTopLeft: CGRect(x: 0, y: outputSize.height / 2, width: outputSize.width, height: outputSize.height / 2),
          outputSize: outputSize
        )
        let primaryLayer = aspectFill(primaryImage, in: topRect)
        let secondaryLayer = aspectFill(secondaryImage, in: bottomRect)
        composedImage = secondaryLayer
          .composited(over: primaryLayer)
          .cropped(to: outputRect)
      } else {
        let mainLayer = aspectFill(primaryImage, in: outputRect)
        let insetTopLeftRect = mapPipRect(pipRect, from: previewSize, to: outputSize)
        let insetRect = ciRect(fromTopLeft: insetTopLeftRect, outputSize: outputSize)
        composedImage = renderPip(
          image: secondaryImage,
          over: mainLayer,
          in: insetRect,
          outputSize: outputSize,
          previewSize: previewSize,
          pipBorderVisible: pipBorderVisible
        ).cropped(to: outputRect)
      }

      let compressionQuality = min(max(jpegQuality / 100, 0.1), 1)
      let outputURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("dualcam-\(UUID().uuidString).jpg")
      try Self.context.writeJPEGRepresentation(
        of: composedImage,
        to: outputURL,
        colorSpace: Self.colorSpace,
        options: [
          kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: compressionQuality
        ]
      )
      return outputURL
    }
  }

  private func normalizedPath(_ path: String) -> String {
    if path.hasPrefix("file://"), let url = URL(string: path) {
      return url.path
    }
    return path
  }

  private func probeImageSizeFast(from path: String) -> CGSize? {
    let url = URL(fileURLWithPath: normalizedPath(path))
    guard let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(imageSource, 0, nil) as? [CFString: Any],
      let width = numberValue(properties[kCGImagePropertyPixelWidth]),
      let height = numberValue(properties[kCGImagePropertyPixelHeight])
    else {
      return nil
    }

    if let rawOrientation = numberValue(properties[kCGImagePropertyOrientation]),
      let orientation = CGImagePropertyOrientation(rawValue: UInt32(rawOrientation)),
      orientation == .left || orientation == .right || orientation == .leftMirrored || orientation == .rightMirrored {
      return CGSize(width: height, height: width)
    }

    return CGSize(width: width, height: height)
  }

  private func loadImageFast(from path: String, maxSide: CGFloat) -> CIImage? {
    let url = URL(fileURLWithPath: normalizedPath(path))
    guard let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil) else {
      return nil
    }

    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: max(1, Int(ceil(maxSide))),
      kCGImageSourceShouldCacheImmediately: false,
    ]
    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(
      imageSource,
      0,
      options as CFDictionary
    ) else {
      return nil
    }

    let image = CIImage(cgImage: cgImage)
    let extent = image.extent
    return image.transformed(
      by: CGAffineTransform(translationX: -extent.minX, y: -extent.minY)
    )
  }

  private func numberValue(_ value: Any?) -> CGFloat? {
    if let number = value as? NSNumber {
      return CGFloat(truncating: number)
    }
    return nil
  }

  private func outputSize(for primarySize: CGSize, aspectRatio: CGFloat, maxLongSide: CGFloat) -> CGSize {
    guard primarySize.width > 0, primarySize.height > 0 else {
      return .zero
    }

    let sourceLongSide = max(primarySize.width, primarySize.height)
    let longSide = maxLongSide > 0 ? min(sourceLongSide, maxLongSide) : sourceLongSide
    guard aspectRatio > 0 else {
      let scale = longSide / sourceLongSide
      return CGSize(width: round(primarySize.width * scale), height: round(primarySize.height * scale))
    }

    if aspectRatio >= 1 {
      return CGSize(width: round(longSide), height: round(longSide / aspectRatio))
    }

    return CGSize(width: round(longSide * aspectRatio), height: round(longSide))
  }

  private func aspectFill(_ image: CIImage, in rect: CGRect) -> CIImage {
    let imageSize = image.extent.size
    guard rect.width > 0, rect.height > 0, imageSize.width > 0, imageSize.height > 0 else {
      return image.cropped(to: .zero)
    }

    let scale = max(rect.width / imageSize.width, rect.height / imageSize.height)
    let scaledWidth = imageSize.width * scale
    let scaledHeight = imageSize.height * scale
    return image
      .transformed(by: CGAffineTransform(scaleX: scale, y: scale))
      .transformed(
        by: CGAffineTransform(
          translationX: rect.midX - scaledWidth / 2,
          y: rect.midY - scaledHeight / 2
        )
      )
      .cropped(to: rect)
  }

  private func mapPipRect(_ pipRect: CGRect, from previewSize: CGSize, to outputSize: CGSize) -> CGRect {
    let scaleX = outputSize.width / max(previewSize.width, 1)
    let scaleY = outputSize.height / max(previewSize.height, 1)
    let pipScale = min(scaleX, scaleY)
    let width = pipRect.width * pipScale
    let height = pipRect.height * pipScale
    let x = min(max(12, pipRect.minX * scaleX), outputSize.width - width - 12)
    let y = min(max(12, pipRect.minY * scaleY), outputSize.height - height - 12)
    return CGRect(x: x, y: y, width: width, height: height)
  }

  private func ciRect(fromTopLeft rect: CGRect, outputSize: CGSize) -> CGRect {
    CGRect(
      x: rect.minX,
      y: outputSize.height - rect.minY - rect.height,
      width: rect.width,
      height: rect.height
    )
  }

  private func renderPip(
    image: CIImage,
    over background: CIImage,
    in rect: CGRect,
    outputSize: CGSize,
    previewSize: CGSize,
    pipBorderVisible: Bool
  ) -> CIImage {
    let radius = min(rect.width, rect.height) * 0.18
    let borderWidth: CGFloat
    if pipBorderVisible {
      borderWidth = max(
        2,
        min(
          outputSize.width / max(previewSize.width, 1),
          outputSize.height / max(previewSize.height, 1)
        ) * 2
      )
    } else {
      borderWidth = 0
    }

    if borderWidth > 0 {
      let outerMask = roundedRectangleMask(rect: rect, radius: radius, outputSize: outputSize)
      let borderTint = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0.38))
        .cropped(to: CGRect(origin: .zero, size: outputSize))
      let tintedBackground = borderTint.composited(over: background)
      let borderBackground = tintedBackground.applyingFilter("CIBlendWithMask", parameters: [
        kCIInputBackgroundImageKey: background,
        kCIInputMaskImageKey: outerMask,
      ])
      let innerRect = rect.insetBy(dx: borderWidth, dy: borderWidth)
      let innerRadius = max(0, radius - borderWidth)
      let pipLayer = aspectFill(image, in: innerRect)
      let innerMask = roundedRectangleMask(
        rect: innerRect,
        radius: innerRadius,
        outputSize: outputSize
      )
      return pipLayer.applyingFilter("CIBlendWithMask", parameters: [
        kCIInputBackgroundImageKey: borderBackground,
        kCIInputMaskImageKey: innerMask,
      ])
    }

    let pipLayer = aspectFill(image, in: rect)
    let mask = roundedRectangleMask(rect: rect, radius: radius, outputSize: outputSize)
    return pipLayer.applyingFilter("CIBlendWithMask", parameters: [
      kCIInputBackgroundImageKey: background,
      kCIInputMaskImageKey: mask,
    ])
  }

  private func roundedRectangleMask(rect: CGRect, radius: CGFloat, outputSize: CGSize) -> CIImage {
    let mask = CIFilter(
      name: "CIRoundedRectangleGenerator",
      parameters: [
        "inputExtent": CIVector(cgRect: rect),
        "inputRadius": radius,
        "inputColor": CIColor(red: 1, green: 1, blue: 1, alpha: 1),
      ]
    )?.outputImage

    return (mask ?? CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0))).cropped(
      to: CGRect(origin: .zero, size: outputSize)
    )
  }

  private func composerError(_ message: String) -> NSError {
    NSError(
      domain: "DualPhotoComposer",
      code: -1,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }
}
