import AVFoundation
import CoreImage
import React

@objc(DualVideoComposer)
final class DualVideoComposer: NSObject {
  private struct VideoGeometry {
    let naturalSize: CGSize
    let orientedSize: CGSize
    let normalizedTransform: CGAffineTransform
    let preferredTransform: CGAffineTransform
    let orientation: CGImagePropertyOrientation
    let isFrontCamera: Bool
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(composeDualVideo:frontVideoPath:layout:pipX:pipY:pipWidth:pipHeight:previewWidth:previewHeight:primaryCamera:resolver:rejecter:)
  func composeDualVideo(
    rearVideoPath: String,
    frontVideoPath: String,
    layout: String,
    pipX: NSNumber,
    pipY: NSNumber,
    pipWidth: NSNumber,
    pipHeight: NSNumber,
    previewWidth: NSNumber,
    previewHeight: NSNumber,
    primaryCamera: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        let outputURL = try await compose(
          rearVideoPath: rearVideoPath,
          frontVideoPath: frontVideoPath,
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
          primaryCamera: primaryCamera
        )
        resolve(outputURL.absoluteString)
      } catch {
        reject("dual_video_compose_failed", error.localizedDescription, error)
      }
    }
  }

  private func compose(
    rearVideoPath: String,
    frontVideoPath: String,
    layout: String,
    pipRect: CGRect,
    previewSize: CGSize,
    primaryCamera: String
  ) async throws -> URL {
    let rearAsset = AVURLAsset(url: URL(fileURLWithPath: rearVideoPath))
    let frontAsset = AVURLAsset(url: URL(fileURLWithPath: frontVideoPath))
    guard
      let rearSourceTrack = try await rearAsset.loadTracks(withMediaType: .video).first,
      let frontSourceTrack = try await frontAsset.loadTracks(withMediaType: .video).first
    else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -1,
        userInfo: [NSLocalizedDescriptionKey: "Missing video tracks"]
      )
    }

    let duration = try await min(rearAsset.load(.duration), frontAsset.load(.duration))
    guard duration.isValid, duration.seconds > 0 else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -4,
        userInfo: [NSLocalizedDescriptionKey: "Recorded videos have invalid duration"]
      )
    }

    let rearGeometry = try await videoGeometry(for: rearSourceTrack, side: "rear")
    let frontGeometry = try await videoGeometry(for: frontSourceTrack, side: "front")
    let primarySize = primaryCamera == "front" ? frontGeometry.orientedSize : rearGeometry.orientedSize
    let outputSize = outputRenderSize(for: primarySize)

    let outputURL = FileManager.default.temporaryDirectory
      .appendingPathComponent(
        "dualcam-video-\(Int(Date().timeIntervalSince1970 * 1000)).mp4"
      )
    try? FileManager.default.removeItem(at: outputURL)

    try renderComposedVideo(
      rearAsset: rearAsset,
      frontAsset: frontAsset,
      rearTrack: rearSourceTrack,
      frontTrack: frontSourceTrack,
      rearGeometry: rearGeometry,
      frontGeometry: frontGeometry,
      outputURL: outputURL,
      outputSize: outputSize,
      duration: duration,
      layout: layout,
      pipRect: pipRect,
      previewSize: previewSize,
      primaryCamera: primaryCamera
    )

    return outputURL
  }

  private func renderComposedVideo(
    rearAsset: AVAsset,
    frontAsset: AVAsset,
    rearTrack: AVAssetTrack,
    frontTrack: AVAssetTrack,
    rearGeometry: VideoGeometry,
    frontGeometry: VideoGeometry,
    outputURL: URL,
    outputSize: CGSize,
    duration: CMTime,
    layout: String,
    pipRect: CGRect,
    previewSize: CGSize,
    primaryCamera: String
  ) throws {
    let rearReader = try AVAssetReader(asset: rearAsset)
    let frontReader = try AVAssetReader(asset: frontAsset)
    let readerSettings: [String: Any] = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferIOSurfacePropertiesKey as String: [:],
    ]
    let rearOutput = AVAssetReaderTrackOutput(track: rearTrack, outputSettings: readerSettings)
    let frontOutput = AVAssetReaderTrackOutput(track: frontTrack, outputSettings: readerSettings)
    rearOutput.alwaysCopiesSampleData = false
    frontOutput.alwaysCopiesSampleData = false

    guard rearReader.canAdd(rearOutput), frontReader.canAdd(frontOutput) else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -7,
        userInfo: [NSLocalizedDescriptionKey: "Failed to create video readers"]
      )
    }
    rearReader.timeRange = CMTimeRange(start: .zero, duration: duration)
    frontReader.timeRange = CMTimeRange(start: .zero, duration: duration)
    rearReader.add(rearOutput)
    frontReader.add(frontOutput)

    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
    let videoSettings: [String: Any] = [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: Int(outputSize.width),
      AVVideoHeightKey: Int(outputSize.height),
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: max(2_500_000, Int(outputSize.width * outputSize.height * 4)),
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      ],
    ]
    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
    writerInput.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: writerInput,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: Int(outputSize.width),
        kCVPixelBufferHeightKey as String: Int(outputSize.height),
        kCVPixelBufferIOSurfacePropertiesKey as String: [:],
      ]
    )

    guard writer.canAdd(writerInput) else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -8,
        userInfo: [NSLocalizedDescriptionKey: "Failed to create video writer"]
      )
    }
    writer.add(writerInput)

    guard rearReader.startReading(), frontReader.startReading() else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -9,
        userInfo: [
          NSLocalizedDescriptionKey: "Failed to start video readers: rear=\(rearReader.error?.localizedDescription ?? "unknown"), front=\(frontReader.error?.localizedDescription ?? "unknown")"
        ]
      )
    }
    guard writer.startWriting() else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -10,
        userInfo: [NSLocalizedDescriptionKey: "Failed to start video writer: \(writer.error?.localizedDescription ?? "unknown")"]
      )
    }
    writer.startSession(atSourceTime: .zero)

    let context = CIContext(options: [
      .workingColorSpace: NSNull(),
      .outputColorSpace: NSNull(),
    ])
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let outputRect = CGRect(origin: .zero, size: outputSize)
    let mainDestination: CGRect
    let insetDestination: CGRect
    if layout == "split" {
      mainDestination = CGRect(x: 0, y: 0, width: outputSize.width, height: outputSize.height / 2)
      insetDestination = CGRect(
        x: 0,
        y: outputSize.height / 2,
        width: outputSize.width,
        height: outputSize.height / 2
      )
    } else {
      mainDestination = outputRect
      insetDestination = mapPipRect(pipRect, from: previewSize, to: outputSize)
    }

    NSLog(
      """
      DualVideoComposer render start version=track-transform-20260609-4 layout=\(layout) primary=\(primaryCamera)
      output=\(formatSize(outputSize)) preview=\(formatSize(previewSize))
      mainDestination=\(formatRect(mainDestination)) insetDestination=\(formatRect(insetDestination))
      rear natural=\(formatSize(rearGeometry.naturalSize)) oriented=\(formatSize(rearGeometry.orientedSize)) preferred=\(formatTransform(rearGeometry.preferredTransform)) orientation=\(orientationText(rearGeometry.orientation))
      front natural=\(formatSize(frontGeometry.naturalSize)) oriented=\(formatSize(frontGeometry.orientedSize)) preferred=\(formatTransform(frontGeometry.preferredTransform)) orientation=\(orientationText(frontGeometry.orientation))
      """
    )

    let mainGeometry = primaryCamera == "front" ? frontGeometry : rearGeometry
    let insetGeometry = primaryCamera == "front" ? rearGeometry : frontGeometry
    var frameCount = 0

    while writer.status == .writing,
      rearReader.status == .reading,
      frontReader.status == .reading {
      guard
        let rearSample = rearOutput.copyNextSampleBuffer(),
        let frontSample = frontOutput.copyNextSampleBuffer(),
        let mainBuffer = CMSampleBufferGetImageBuffer(primaryCamera == "front" ? frontSample : rearSample),
        let insetBuffer = CMSampleBufferGetImageBuffer(primaryCamera == "front" ? rearSample : frontSample)
      else {
        break
      }

      let presentationTime = CMSampleBufferGetPresentationTimeStamp(
        primaryCamera == "front" ? frontSample : rearSample
      )
      if presentationTime > duration {
        break
      }

      while !writerInput.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.002)
      }

      guard let pixelBufferPool = adaptor.pixelBufferPool else {
        throw NSError(
          domain: "DualVideoComposer",
          code: -11,
          userInfo: [NSLocalizedDescriptionKey: "Video writer pixel buffer pool is unavailable"]
        )
      }

      var outputBuffer: CVPixelBuffer?
      let bufferStatus = CVPixelBufferPoolCreatePixelBuffer(
        kCFAllocatorDefault,
        pixelBufferPool,
        &outputBuffer
      )
      guard bufferStatus == kCVReturnSuccess, let outputBuffer else {
        throw NSError(
          domain: "DualVideoComposer",
          code: -12,
          userInfo: [NSLocalizedDescriptionKey: "Failed to create output pixel buffer"]
        )
      }

      autoreleasepool {
        let background = CIImage(color: .black).cropped(to: outputRect)
        let mainImage = renderImage(
          from: mainBuffer,
          geometry: mainGeometry,
          destination: mainDestination,
          outputSize: outputSize
        )
        let insetImage = renderImage(
          from: insetBuffer,
          geometry: insetGeometry,
          destination: insetDestination,
          outputSize: outputSize
        )
        if frameCount == 0 {
          let mainRawImage = CIImage(cvPixelBuffer: mainBuffer)
          let insetRawImage = CIImage(cvPixelBuffer: insetBuffer)
          let mainNormalizedImage = normalizedTrackImage(from: mainBuffer, geometry: mainGeometry)
          let insetNormalizedImage = normalizedTrackImage(from: insetBuffer, geometry: insetGeometry)
          let composedImage = insetImage.composited(over: mainImage.composited(over: background))
          writeDebugImage(mainImage, name: "main-rendered", context: context, colorSpace: colorSpace)
          writeDebugImage(insetImage, name: "inset-rendered", context: context, colorSpace: colorSpace)
          writeDebugImage(composedImage, name: "composed", context: context, colorSpace: colorSpace)
          NSLog(
            """
            DualVideoComposer first frame
            main rawExtent=\(formatRect(mainRawImage.extent)) normalizedExtent=\(formatRect(mainNormalizedImage.extent)) renderedExtent=\(formatRect(mainImage.extent)) destination=\(formatRect(mainDestination))
            inset rawExtent=\(formatRect(insetRawImage.extent)) normalizedExtent=\(formatRect(insetNormalizedImage.extent)) renderedExtent=\(formatRect(insetImage.extent)) destination=\(formatRect(insetDestination))
            main avg raw=\(averageColorText(mainRawImage, context: context)) normalized=\(averageColorText(mainNormalizedImage, context: context)) rendered=\(averageColorText(mainImage, context: context))
            inset avg raw=\(averageColorText(insetRawImage, context: context)) normalized=\(averageColorText(insetNormalizedImage, context: context)) rendered=\(averageColorText(insetImage, context: context))
            composed avg=\(averageColorText(composedImage, context: context))
            """
          )
          context.render(composedImage, to: outputBuffer, bounds: outputRect, colorSpace: colorSpace)
        } else {
          let composedImage = insetImage.composited(over: mainImage.composited(over: background))
          context.render(composedImage, to: outputBuffer, bounds: outputRect, colorSpace: colorSpace)
        }
      }

      if !adaptor.append(outputBuffer, withPresentationTime: presentationTime) {
        throw NSError(
          domain: "DualVideoComposer",
          code: -13,
          userInfo: [NSLocalizedDescriptionKey: "Failed to append video frame: \(writer.error?.localizedDescription ?? "unknown")"]
        )
      }
      frameCount += 1
    }

    writerInput.markAsFinished()
    if rearReader.status == .failed || frontReader.status == .failed {
      throw NSError(
        domain: "DualVideoComposer",
        code: -14,
        userInfo: [
          NSLocalizedDescriptionKey: "Video reader failed: rear=\(rearReader.error?.localizedDescription ?? "unknown"), front=\(frontReader.error?.localizedDescription ?? "unknown")"
        ]
      )
    }

    try finishWriting(writer)
    NSLog("DualVideoComposer render completed frames=\(frameCount) output=\(outputURL.path)")
  }

  private func finishWriting(_ writer: AVAssetWriter) throws {
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting {
      semaphore.signal()
    }
    semaphore.wait()

    guard writer.status == .completed else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -15,
        userInfo: [NSLocalizedDescriptionKey: "Video writer failed: \(writer.error?.localizedDescription ?? "unknown")"]
      )
    }
  }

  private func renderImage(
    from pixelBuffer: CVPixelBuffer,
    geometry: VideoGeometry,
    destination: CGRect,
    outputSize: CGSize
  ) -> CIImage {
    let orientedImage = normalizedTrackImage(from: pixelBuffer, geometry: geometry)
    let sourceRect = coverSourceRect(sourceSize: orientedImage.extent.size, destination: destination)
    let scaleX = destination.width / sourceRect.width
    let scaleY = destination.height / sourceRect.height
    let croppedImage = orientedImage.cropped(to: sourceRect)
    let transform = CGAffineTransform(translationX: -sourceRect.minX, y: -sourceRect.minY)
      .concatenating(CGAffineTransform(scaleX: scaleX, y: scaleY))
      .concatenating(CGAffineTransform(translationX: destination.minX, y: destination.minY))

    return croppedImage
      .transformed(by: transform)
      .cropped(to: CGRect(origin: .zero, size: outputSize))
  }

  private func normalizedTrackImage(from pixelBuffer: CVPixelBuffer, geometry: VideoGeometry) -> CIImage {
    let image = CIImage(cvPixelBuffer: pixelBuffer)
    let transformedImage = image.transformed(by: geometry.preferredTransform)
    let transformedExtent = transformedImage.extent
    let trackOrientedImage = transformedImage.transformed(
      by: CGAffineTransform(translationX: -transformedExtent.minX, y: -transformedExtent.minY)
    )
    let orientedImage: CIImage

    if trackOrientedImage.extent.width > trackOrientedImage.extent.height,
      geometry.orientedSize.height > geometry.orientedSize.width {
      orientedImage = image.oriented(geometry.orientation)
    } else {
      orientedImage = trackOrientedImage
    }

    let displayImage = orientedImage.oriented(.down)
    let orientedExtent = displayImage.extent
    let normalizedImage = displayImage.transformed(
      by: CGAffineTransform(translationX: -orientedExtent.minX, y: -orientedExtent.minY)
    )
    return normalizedImage.settingAlphaOne(in: CGRect(origin: .zero, size: normalizedImage.extent.size))
  }

  private func averageColorText(_ image: CIImage, context: CIContext) -> String {
    let extent = image.extent
    guard extent.width > 0, extent.height > 0 else {
      return "empty"
    }

    let filter = CIFilter(
      name: "CIAreaAverage",
      parameters: [
        kCIInputImageKey: image,
        kCIInputExtentKey: CIVector(cgRect: extent),
      ]
    )
    guard let output = filter?.outputImage else {
      return "unavailable"
    }

    var bitmap = [UInt8](repeating: 0, count: 4)
    context.render(
      output,
      toBitmap: &bitmap,
      rowBytes: 4,
      bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
      format: .RGBA8,
      colorSpace: CGColorSpaceCreateDeviceRGB()
    )
    return "r:\(bitmap[0]) g:\(bitmap[1]) b:\(bitmap[2]) a:\(bitmap[3])"
  }

  private func writeDebugImage(
    _ image: CIImage,
    name: String,
    context: CIContext,
    colorSpace: CGColorSpace
  ) {
    let extent = image.extent
    guard extent.width > 0, extent.height > 0 else { return }

    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent(
        "dualcam-debug-\(name)-\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
      )
    do {
      try context.writeJPEGRepresentation(
        of: image.cropped(to: extent),
        to: url,
        colorSpace: colorSpace,
        options: [:]
      )
      NSLog("DualVideoComposer debug image \(name)=\(url.path)")
    } catch {
      NSLog("DualVideoComposer debug image failed \(name): \(error.localizedDescription)")
    }
  }

  private func videoGeometry(for track: AVAssetTrack, side: String) async throws -> VideoGeometry {
    let naturalSize = try await track.load(.naturalSize)
    let transform = try await track.load(.preferredTransform)
    let transformedRect = CGRect(origin: .zero, size: naturalSize).applying(transform)
    let transformRotatesFrame = abs(round(transform.b)) == 1 || abs(round(transform.c)) == 1
    let orientedSize: CGSize
    if transformRotatesFrame {
      orientedSize = CGSize(width: abs(transformedRect.width), height: abs(transformedRect.height))
    } else if naturalSize.width > naturalSize.height {
      orientedSize = CGSize(width: naturalSize.height, height: naturalSize.width)
    } else {
      orientedSize = naturalSize
    }
    let normalizedTransform = transform.concatenating(
      CGAffineTransform(
        translationX: -transformedRect.minX,
        y: -transformedRect.minY
      )
    )

    return VideoGeometry(
      naturalSize: naturalSize,
      orientedSize: orientedSize,
      normalizedTransform: normalizedTransform,
      preferredTransform: transform,
      orientation: imageOrientation(for: transform, naturalSize: naturalSize, side: side),
      isFrontCamera: side == "front"
    )
  }

  private func imageOrientation(
    for transform: CGAffineTransform,
    naturalSize: CGSize,
    side: String
  ) -> CGImagePropertyOrientation {
    let rounded = CGAffineTransform(
      a: round(transform.a),
      b: round(transform.b),
      c: round(transform.c),
      d: round(transform.d),
      tx: 0,
      ty: 0
    )

    if rounded.a == 1, rounded.b == 0, rounded.c == 0, rounded.d == 1 {
      guard naturalSize.width > naturalSize.height else {
        return .up
      }
      return side == "front" ? .left : .right
    }
    if rounded.a == 0, rounded.b == 1, rounded.c == -1, rounded.d == 0 {
      return .right
    }
    if rounded.a == 0, rounded.b == -1, rounded.c == 1, rounded.d == 0 {
      return .left
    }
    if rounded.a == -1, rounded.b == 0, rounded.c == 0, rounded.d == -1 {
      return .down
    }
    return .up
  }

  private func outputRenderSize(for sourceSize: CGSize) -> CGSize {
    let longSide: CGFloat = 1280
    if sourceSize.height >= sourceSize.width {
      return evenSize(
        CGSize(width: round(longSide * sourceSize.width / sourceSize.height), height: longSide)
      )
    }
    return evenSize(
      CGSize(width: longSide, height: round(longSide * sourceSize.height / sourceSize.width))
    )
  }

  private func evenSize(_ size: CGSize) -> CGSize {
    CGSize(
      width: max(2, floor(size.width / 2) * 2),
      height: max(2, floor(size.height / 2) * 2)
    )
  }

  private func mapPipRect(_ rect: CGRect, from previewSize: CGSize, to outputSize: CGSize) -> CGRect {
    guard previewSize.width > 0, previewSize.height > 0 else {
      return CGRect(
        x: outputSize.width * 0.58,
        y: outputSize.height * 0.12,
        width: outputSize.width * 0.32,
        height: outputSize.height * 0.32
      )
    }

    let scaleX = outputSize.width / previewSize.width
    let scaleY = outputSize.height / previewSize.height
    let scale = min(scaleX, scaleY)
    let width = rect.width * scale
    let height = rect.height * scale
    let topY = rect.minY * scaleY
    let canvasY = outputSize.height - topY - height

    return CGRect(
      x: min(max(12, rect.minX * scaleX), outputSize.width - width - 12),
      y: min(max(12, canvasY), outputSize.height - height - 12),
      width: width,
      height: height
    )
  }

  private func coverSourceRect(sourceSize: CGSize, destination: CGRect) -> CGRect {
    let sourceRatio = sourceSize.width / sourceSize.height
    let destinationRatio = destination.width / destination.height

    if sourceRatio > destinationRatio {
      let width = sourceSize.height * destinationRatio
      return CGRect(x: (sourceSize.width - width) / 2, y: 0, width: width, height: sourceSize.height)
    }

    let height = sourceSize.width / destinationRatio
    return CGRect(x: 0, y: (sourceSize.height - height) / 2, width: sourceSize.width, height: height)
  }

  private func formatSize(_ size: CGSize) -> String {
    "\(formatNumber(size.width))x\(formatNumber(size.height))"
  }

  private func formatRect(_ rect: CGRect) -> String {
    "x:\(formatNumber(rect.minX)) y:\(formatNumber(rect.minY)) w:\(formatNumber(rect.width)) h:\(formatNumber(rect.height))"
  }

  private func formatTransform(_ transform: CGAffineTransform) -> String {
    "[a:\(formatNumber(transform.a)) b:\(formatNumber(transform.b)) c:\(formatNumber(transform.c)) d:\(formatNumber(transform.d)) tx:\(formatNumber(transform.tx)) ty:\(formatNumber(transform.ty))]"
  }

  private func orientationText(_ orientation: CGImagePropertyOrientation) -> String {
    switch orientation {
    case .up:
      return "up"
    case .upMirrored:
      return "upMirrored"
    case .down:
      return "down"
    case .downMirrored:
      return "downMirrored"
    case .left:
      return "left"
    case .leftMirrored:
      return "leftMirrored"
    case .right:
      return "right"
    case .rightMirrored:
      return "rightMirrored"
    @unknown default:
      return "unknown"
    }
  }

  private func formatNumber(_ value: CGFloat) -> String {
    String(format: "%.3f", Double(value))
  }
}
