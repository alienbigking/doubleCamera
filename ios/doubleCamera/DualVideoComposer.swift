// 原生双摄视频合成器：将前后摄录像对齐、合成为单个视频并保留主摄音频。
import AVFoundation
import CoreImage
import React
import UIKit
import os

@objc(DualVideoComposer)
final class DualVideoComposer: NSObject {
  private struct VideoGeometry {
    let naturalSize: CGSize
    let orientedSize: CGSize
    let preferredTransform: CGAffineTransform
    let orientation: CGImagePropertyOrientation
  }

  private static let performanceLog = OSLog(
    subsystem: "com.skqy.doublecamera.app",
    category: "DualVideo"
  )

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(
    composeDualVideo:frontVideoPath:layout:pipX:pipY:pipWidth:pipHeight:previewWidth:previewHeight:
    aspectRatio:primaryCamera:pipBorderVisible:resolver:rejecter:
  )
  /// 接收 JS 合成请求，并在后台队列执行双摄视频合成。
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
    aspectRatio: NSNumber,
    primaryCamera: String,
    pipBorderVisible: Bool,
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
          aspectRatio: CGFloat(truncating: aspectRatio),
          primaryCamera: primaryCamera,
          pipBorderVisible: pipBorderVisible
        )
        resolve(outputURL.absoluteString)
      } catch {
        reject("dual_video_compose_failed", error.localizedDescription, error)
      }
    }
  }

  /// 对齐前后摄轨道、渲染合成画面并保留主摄音频。
  private func compose(
    rearVideoPath: String,
    frontVideoPath: String,
    layout: String,
    pipRect: CGRect,
    previewSize: CGSize,
    aspectRatio: CGFloat,
    primaryCamera: String,
    pipBorderVisible: Bool
  ) async throws -> URL {
    let composeStartedAt = CFAbsoluteTimeGetCurrent()
    let signpostID = OSSignpostID(log: Self.performanceLog)
    os_signpost(.begin, log: Self.performanceLog, name: "合成", signpostID: signpostID)
    defer {
      os_signpost(.end, log: Self.performanceLog, name: "合成", signpostID: signpostID)
    }

    let rearAsset = AVURLAsset(url: URL(fileURLWithPath: rearVideoPath))
    let frontAsset = AVURLAsset(url: URL(fileURLWithPath: frontVideoPath))
    guard
      let rearSourceTrack = try await rearAsset.loadTracks(withMediaType: .video).first,
      let frontSourceTrack = try await frontAsset.loadTracks(withMediaType: .video).first
    else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -1,
        userInfo: [NSLocalizedDescriptionKey: "缺少视频轨道"]
      )
    }

    let duration = try await min(rearAsset.load(.duration), frontAsset.load(.duration))
    guard duration.isValid, duration.seconds > 0 else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -4,
        userInfo: [NSLocalizedDescriptionKey: "录像时长无效"]
      )
    }

    let rearGeometry = try await videoGeometry(for: rearSourceTrack, side: "rear")
    let frontGeometry = try await videoGeometry(for: frontSourceTrack, side: "front")
    let primaryAsset = primaryCamera == "front" ? frontAsset : rearAsset
    let primarySize =
      primaryCamera == "front" ? frontGeometry.orientedSize : rearGeometry.orientedSize
    let outputSize = outputSize(for: primarySize, aspectRatio: aspectRatio)

    let outputURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("dualcam-video-\(UUID().uuidString).mp4")
    var shouldKeepOutput = false
    defer {
      if !shouldKeepOutput {
        try? FileManager.default.removeItem(at: outputURL)
      }
    }

    let renderStartedAt = CFAbsoluteTimeGetCurrent()
    let frameCount = try renderComposedVideo(
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
      aspectRatio: aspectRatio,
      primaryCamera: primaryCamera,
      pipBorderVisible: pipBorderVisible
    )
    let renderElapsed = CFAbsoluteTimeGetCurrent() - renderStartedAt
    let renderedAsset = AVURLAsset(url: outputURL)
    let renderedDuration = try await renderedAsset.load(.duration)
    let audioDuration = min(duration, renderedDuration)
    try await muxPrimaryAudioIfNeeded(
      from: primaryAsset,
      videoURL: outputURL,
      duration: audioDuration
    )
    shouldKeepOutput = true

    let outputBytes =
      ((try? FileManager.default.attributesOfItem(atPath: outputURL.path)[.size]) as? NSNumber)?
      .int64Value ?? 0
    NSLog(
      "双摄视频性能统计：时长=%.2f秒 帧数=%ld 输出=%dx%d 渲染=%.2f秒 总耗时=%.2f秒 文件大小=%.1fMB",
      duration.seconds,
      frameCount,
      Int(outputSize.width),
      Int(outputSize.height),
      renderElapsed,
      CFAbsoluteTimeGetCurrent() - composeStartedAt,
      Double(outputBytes) / 1_048_576
    )

    return outputURL
  }

  /// 根据输入轨道和画中画参数逐帧渲染最终视频。
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
    aspectRatio: CGFloat,
    primaryCamera: String,
    pipBorderVisible: Bool
  ) throws -> Int {
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
        userInfo: [NSLocalizedDescriptionKey: "创建视频读取器失败"]
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
        userInfo: [NSLocalizedDescriptionKey: "创建视频写入器失败"]
      )
    }
    writer.add(writerInput)

    guard rearReader.startReading(), frontReader.startReading() else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -9,
        userInfo: [
          NSLocalizedDescriptionKey:
            "启动视频读取器失败：后摄=\(rearReader.error?.localizedDescription ?? "未知")，前摄=\(frontReader.error?.localizedDescription ?? "未知")"
        ]
      )
    }
    guard writer.startWriting() else {
      throw NSError(
        domain: "DualVideoComposer",
        code: -10,
        userInfo: [
          NSLocalizedDescriptionKey:
            "启动视频写入器失败：\(writer.error?.localizedDescription ?? "未知")"
        ]
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
      mainDestination = CGRect(
        x: 0,
        y: outputSize.height / 2,
        width: outputSize.width,
        height: outputSize.height / 2
      )
      insetDestination = CGRect(
        x: 0,
        y: 0,
        width: outputSize.width,
        height: outputSize.height / 2
      )
    } else {
      mainDestination = outputRect
      insetDestination = mapPipRect(pipRect, from: previewSize, to: outputSize)
    }
    let pipBorderImage =
      layout == "pip" && pipBorderVisible
      ? makePipBorderImage(destination: insetDestination, sourceRect: pipRect)
      : nil
    let pipMaskImage =
      layout == "pip"
      ? makePipMaskImage(destination: insetDestination, outputSize: outputSize)
      : nil

    let mainGeometry = primaryCamera == "front" ? frontGeometry : rearGeometry
    let insetGeometry = primaryCamera == "front" ? rearGeometry : frontGeometry
    var frameCount = 0
    var outputTimeOrigin: CMTime?
    var openingFrameAttempts = 0

    while writer.status == .writing,
      rearReader.status == .reading,
      frontReader.status == .reading
    {
      guard
        let rearSample = rearOutput.copyNextSampleBuffer(),
        let frontSample = frontOutput.copyNextSampleBuffer()
      else {
        break
      }

      let mainSample = primaryCamera == "front" ? frontSample : rearSample
      let insetSample = primaryCamera == "front" ? rearSample : frontSample

      guard
        let mainBuffer = CMSampleBufferGetImageBuffer(mainSample),
        let insetBuffer = CMSampleBufferGetImageBuffer(insetSample)
      else {
        break
      }

      let presentationTime = CMSampleBufferGetPresentationTimeStamp(mainSample)
      if presentationTime > duration {
        break
      }

      if frameCount == 0, openingFrameAttempts < 15 {
        openingFrameAttempts += 1
        let mainIsBlack = isMostlyBlack(
          normalizedTrackImage(from: mainBuffer, geometry: mainGeometry),
          context: context
        )
        let insetIsBlack = isMostlyBlack(
          normalizedTrackImage(from: insetBuffer, geometry: insetGeometry),
          context: context
        )
        if mainIsBlack || insetIsBlack {
          continue
        }
      }

      while !writerInput.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.002)
      }

      guard let pixelBufferPool = adaptor.pixelBufferPool else {
        throw NSError(
          domain: "DualVideoComposer",
          code: -11,
          userInfo: [NSLocalizedDescriptionKey: "视频写入器像素缓冲池不可用"]
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
          userInfo: [NSLocalizedDescriptionKey: "创建输出像素缓冲区失败"]
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
        let rawInsetImage = renderImage(
          from: insetBuffer,
          geometry: insetGeometry,
          destination: insetDestination,
          outputSize: outputSize
        )
        let insetImage = clipPipImage(
          rawInsetImage, maskImage: pipMaskImage, outputSize: outputSize)
        let composedImage = composeLayers(
          mainImage: mainImage,
          insetImage: insetImage,
          background: background,
          pipBorderImage: pipBorderImage
        )
        context.render(composedImage, to: outputBuffer, bounds: outputRect, colorSpace: colorSpace)
      }

      let outputTime =
        outputTimeOrigin.map {
          CMTimeSubtract(presentationTime, $0)
        } ?? presentationTime
      outputTimeOrigin = outputTimeOrigin ?? presentationTime
      if !adaptor.append(outputBuffer, withPresentationTime: outputTime) {
        throw NSError(
          domain: "DualVideoComposer",
          code: -13,
          userInfo: [
            NSLocalizedDescriptionKey:
              "追加视频帧失败：\(writer.error?.localizedDescription ?? "未知")"
          ]
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
          NSLocalizedDescriptionKey:
            "视频读取失败：后摄=\(rearReader.error?.localizedDescription ?? "未知")，前摄=\(frontReader.error?.localizedDescription ?? "未知")"
        ]
      )
    }

    try finishWriting(writer)
    return frameCount
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
        userInfo: [
          NSLocalizedDescriptionKey:
            "视频写入失败：\(writer.error?.localizedDescription ?? "未知")"
        ]
      )
    }
  }

  /// 将主摄音轨复用到合成视频，限制音频长度与最终画面一致。
  private func muxPrimaryAudioIfNeeded(
    from asset: AVAsset,
    videoURL: URL,
    duration: CMTime
  ) async throws {
    guard let audioTrack = try await asset.loadTracks(withMediaType: .audio).first else {
      return
    }

    let renderedAsset = AVURLAsset(url: videoURL)
    guard let renderedVideoTrack = try await renderedAsset.loadTracks(withMediaType: .video).first
    else {
      return
    }

    let composition = AVMutableComposition()
    guard
      let compositionVideoTrack = composition.addMutableTrack(
        withMediaType: .video,
        preferredTrackID: kCMPersistentTrackID_Invalid
      ),
      let compositionAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
      )
    else {
      return
    }

    let timeRange = CMTimeRange(start: .zero, duration: duration)
    try compositionVideoTrack.insertTimeRange(timeRange, of: renderedVideoTrack, at: .zero)
    compositionVideoTrack.preferredTransform = .identity
    try compositionAudioTrack.insertTimeRange(timeRange, of: audioTrack, at: .zero)

    guard
      let exportSession = AVAssetExportSession(
        asset: composition,
        presetName: AVAssetExportPresetPassthrough
      )
    else {
      return
    }

    let audioOutputURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("dualcam-video-audio-\(UUID().uuidString).mp4")
    defer {
      try? FileManager.default.removeItem(at: audioOutputURL)
    }

    exportSession.outputURL = audioOutputURL
    exportSession.outputFileType = .mp4
    exportSession.shouldOptimizeForNetworkUse = false

    try await withCheckedThrowingContinuation { continuation in
      exportSession.exportAsynchronously {
        switch exportSession.status {
        case .completed:
          continuation.resume()
        case .failed, .cancelled:
          continuation.resume(
            throwing: exportSession.error
              ?? NSError(
                domain: "DualVideoComposer",
                code: -16,
                userInfo: [NSLocalizedDescriptionKey: "导出带音频的合成视频失败。"]
              )
          )
        default:
          continuation.resume(
            throwing: NSError(
              domain: "DualVideoComposer",
              code: -17,
              userInfo: [
                NSLocalizedDescriptionKey: "合成视频导出结束时状态异常。"
              ]
            )
          )
        }
      }
    }

    try FileManager.default.removeItem(at: videoURL)
    try FileManager.default.moveItem(at: audioOutputURL, to: videoURL)
  }

  private func composeLayers(
    mainImage: CIImage,
    insetImage: CIImage,
    background: CIImage,
    pipBorderImage: CIImage?
  ) -> CIImage {
    var composedImage = insetImage.composited(over: mainImage.composited(over: background))
    if let pipBorderImage {
      composedImage = pipBorderImage.composited(over: composedImage)
    }
    return composedImage
  }

  private func makePipBorderImage(destination: CGRect, sourceRect: CGRect) -> CIImage? {
    guard destination.width > 0, destination.height > 0 else { return nil }

    let scaleX = sourceRect.width > 0 ? destination.width / sourceRect.width : 1
    let scaleY = sourceRect.height > 0 ? destination.height / sourceRect.height : scaleX
    let borderWidth = max(2, min(scaleX, scaleY) * 2)
    let size = CGSize(width: ceil(destination.width), height: ceil(destination.height))
    let cornerRadius = min(destination.width, destination.height) * 0.22
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    let image = renderer.image { context in
      UIColor.clear.setFill()
      context.fill(CGRect(origin: .zero, size: size))

      let outerRect = CGRect(origin: .zero, size: size)
      let innerRect = outerRect.insetBy(dx: borderWidth, dy: borderWidth)
      let outerPath = UIBezierPath(roundedRect: outerRect, cornerRadius: cornerRadius)
      let innerPath = UIBezierPath(
        roundedRect: innerRect,
        cornerRadius: max(0, cornerRadius - borderWidth)
      )
      outerPath.append(innerPath)
      outerPath.usesEvenOddFillRule = true

      UIColor(white: 0, alpha: 0.38).setFill()
      outerPath.fill()
    }

    guard let cgImage = image.cgImage else { return nil }
    return CIImage(cgImage: cgImage).transformed(
      by: CGAffineTransform(translationX: destination.minX, y: destination.minY)
    )
  }

  private func makePipMaskImage(destination: CGRect, outputSize: CGSize) -> CIImage? {
    guard destination.width > 0, destination.height > 0 else { return nil }

    let size = CGSize(width: ceil(destination.width), height: ceil(destination.height))
    let cornerRadius = min(destination.width, destination.height) * 0.22
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    let image = renderer.image { context in
      UIColor.clear.setFill()
      context.fill(CGRect(origin: .zero, size: size))

      let path = UIBezierPath(
        roundedRect: CGRect(origin: .zero, size: size),
        cornerRadius: cornerRadius
      )
      UIColor.white.setFill()
      path.fill()
    }

    guard let cgImage = image.cgImage else { return nil }
    return CIImage(cgImage: cgImage)
      .transformed(by: CGAffineTransform(translationX: destination.minX, y: destination.minY))
      .cropped(to: CGRect(origin: .zero, size: outputSize))
  }

  private func clipPipImage(_ image: CIImage, maskImage: CIImage?, outputSize: CGSize) -> CIImage {
    guard let maskImage else { return image }

    let parameters: [String: Any] = [
      kCIInputImageKey: image,
      kCIInputBackgroundImageKey: maskImage,
    ]
    guard let filter = CIFilter(name: "CISourceInCompositing", parameters: parameters),
      let outputImage = filter.outputImage
    else {
      return image
    }

    return outputImage.cropped(to: CGRect(origin: .zero, size: outputSize))
  }

  private func renderImage(
    from pixelBuffer: CVPixelBuffer,
    geometry: VideoGeometry,
    destination: CGRect,
    outputSize: CGSize
  ) -> CIImage {
    let orientedImage = normalizedTrackImage(from: pixelBuffer, geometry: geometry)
    let sourceRect = coverSourceRect(
      sourceSize: orientedImage.extent.size, destination: destination)
    let scaleX = destination.width / sourceRect.width
    let scaleY = destination.height / sourceRect.height
    let croppedImage = orientedImage.cropped(to: sourceRect)
    let transform = CGAffineTransform(translationX: -sourceRect.minX, y: -sourceRect.minY)
      .concatenating(CGAffineTransform(scaleX: scaleX, y: scaleY))
      .concatenating(CGAffineTransform(translationX: destination.minX, y: destination.minY))

    return
      croppedImage
      .transformed(by: transform)
      .cropped(to: CGRect(origin: .zero, size: outputSize))
  }

  private func normalizedTrackImage(from pixelBuffer: CVPixelBuffer, geometry: VideoGeometry)
    -> CIImage
  {
    let image = CIImage(cvPixelBuffer: pixelBuffer)
    let transformedImage = image.transformed(by: geometry.preferredTransform)
    let transformedExtent = transformedImage.extent
    let trackOrientedImage = transformedImage.transformed(
      by: CGAffineTransform(translationX: -transformedExtent.minX, y: -transformedExtent.minY)
    )
    let orientedImage: CIImage

    if trackOrientedImage.extent.width > trackOrientedImage.extent.height,
      geometry.orientedSize.height > geometry.orientedSize.width
    {
      orientedImage = image.oriented(geometry.orientation)
    } else {
      orientedImage = trackOrientedImage
    }

    let orientedExtent = orientedImage.extent
    let normalizedImage = orientedImage.transformed(
      by: CGAffineTransform(translationX: -orientedExtent.minX, y: -orientedExtent.minY)
    )
    return normalizedImage.settingAlphaOne(
      in: CGRect(origin: .zero, size: normalizedImage.extent.size))
  }

  private func isMostlyBlack(_ image: CIImage, context: CIContext) -> Bool {
    let extent = image.extent
    guard extent.width > 0, extent.height > 0 else {
      return true
    }

    let filter = CIFilter(
      name: "CIAreaAverage",
      parameters: [
        kCIInputImageKey: image,
        kCIInputExtentKey: CIVector(cgRect: extent),
      ]
    )
    guard let output = filter?.outputImage else {
      return false
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

    let brightness = Int(bitmap[0]) + Int(bitmap[1]) + Int(bitmap[2])
    return brightness < 18
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
    return VideoGeometry(
      naturalSize: naturalSize,
      orientedSize: orientedSize,
      preferredTransform: transform,
      orientation: imageOrientation(for: transform, naturalSize: naturalSize, side: side)
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

  private func outputSize(for sourceSize: CGSize, aspectRatio: CGFloat) -> CGSize {
    guard aspectRatio > 0 else {
      return evenSize(sourceSize)
    }

    let longSide = max(sourceSize.width, sourceSize.height)
    let fittedSize: CGSize

    if aspectRatio >= 1 {
      fittedSize = CGSize(width: longSide, height: round(longSide / aspectRatio))
    } else {
      fittedSize = CGSize(width: round(longSide * aspectRatio), height: longSide)
    }

    return evenSize(fittedSize)
  }

  private func evenSize(_ size: CGSize) -> CGSize {
    CGSize(
      width: max(2, floor(size.width / 2) * 2),
      height: max(2, floor(size.height / 2) * 2)
    )
  }

  private func mapPipRect(_ rect: CGRect, from previewSize: CGSize, to outputSize: CGSize) -> CGRect
  {
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
      return CGRect(
        x: (sourceSize.width - width) / 2, y: 0, width: width, height: sourceSize.height)
    }

    let height = sourceSize.width / destinationRatio
    return CGRect(
      x: 0, y: (sourceSize.height - height) / 2, width: sourceSize.width, height: height)
  }

}
