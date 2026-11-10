// 原生录像管线：处理录像生命周期、视频帧合成、时间轴校准和临时文件清理。
import AVFoundation
import Foundation
import React
import os

private final class NativeDualCameraRecordingFinishState: @unchecked Sendable {
  private let lock = NSLock()
  private var storedError: Error?

  func record(_ error: Error?) {
    guard let error else { return }
    lock.lock()
    storedError = storedError ?? error
    lock.unlock()
  }

  var error: Error? {
    lock.lock()
    defer { lock.unlock() }
    return storedError
  }
}

extension NativeDualCameraView {
  func recordingOutputSize(for resolution: String) -> CGSize {
    switch resolution.lowercased() {
    case "720p": return CGSize(width: 720, height: 1280)
    default: return CGSize(width: 1080, height: 1920)
    }
  }

  func recordingOutputSize(baseSize: CGSize, aspectRatio: CGFloat) -> CGSize {
    guard aspectRatio > 0 else { return baseSize }
    let longSide = max(baseSize.width, baseSize.height)
    let size =
      aspectRatio >= 1
      ? CGSize(width: longSide, height: longSide / aspectRatio)
      : CGSize(width: longSide * aspectRatio, height: longSide)
    return CGSize(
      width: max(2, floor(size.width / 2) * 2), height: max(2, floor(size.height / 2) * 2))
  }

  /// 配置录像参数、写入器和时间轴，并开始接收双摄视频帧。
  func startVideoRecording(
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
      guard !self.isRecording else {
        resolve(nil)
        return
      }

      let resolutionLabel = (options["resolution"] as? String) ?? "1080p"
      let frameRate = 30
      let audioEnabled = options["audioEnabled"] as? Bool ?? false
      let audioChannels = Int(truncating: options["audioChannels"] as? NSNumber ?? 2)
      let audioSampleRate = Double(truncating: options["audioSampleRate"] as? NSNumber ?? 48_000)
      let baseOutputSize = self.recordingOutputSize(for: resolutionLabel)
      let aspectRatio = CGFloat(truncating: options["aspectRatio"] as? NSNumber ?? 0)
      let outputSize = self.recordingOutputSize(
        baseSize: baseOutputSize,
        aspectRatio: aspectRatio
      )
      let saveMode = (options["saveMode"] as? String) ?? "combined"
      let keepSeparateStreams = saveMode != "combined"

      self.recordingPrimaryCamera = (options["primaryCamera"] as? String) ?? "rear"
      self.recordingLayout = (options["layout"] as? String) ?? "pip"
      self.recordingPipRect = CGRect(
        x: CGFloat(truncating: options["pipX"] as? NSNumber ?? 0),
        y: CGFloat(truncating: options["pipY"] as? NSNumber ?? 0),
        width: CGFloat(truncating: options["pipWidth"] as? NSNumber ?? 142),
        height: CGFloat(truncating: options["pipHeight"] as? NSNumber ?? 184)
      )
      self.recordingPreviewSize = CGSize(
        width: CGFloat(truncating: options["previewWidth"] as? NSNumber ?? 1),
        height: CGFloat(truncating: options["previewHeight"] as? NSNumber ?? 1)
      )
      self.recordingOutputSize = outputSize
      self.recordingPipBorderVisible = options["pipBorderVisible"] as? Bool ?? true
      self.recordingKeepSeparateStreams = keepSeparateStreams

      do {
        if audioEnabled {
          try self.ensureAudioCaptureConfigured()
        }
        try self.prepareVideoWriters(
          outputSize: outputSize,
          rawOutputSize: baseOutputSize,
          frameRate: frameRate,
          audioEnabled: audioEnabled,
          audioChannels: audioChannels,
          audioSampleRate: audioSampleRate,
          keepSeparateStreams: keepSeparateStreams
        )
        let signpostID = OSSignpostID(log: Self.performanceLog)
        self.recordingSignpostID = signpostID
        self.recordingStartedAt = CFAbsoluteTimeGetCurrent()
        self.resetRecordingMetrics()
        os_signpost(
          .begin,
          log: Self.performanceLog,
          name: "录像",
          signpostID: signpostID,
          "分辨率=%{public}@ 帧率=%ld 音频=%{public}@",
          resolutionLabel,
          frameRate,
          audioEnabled.description
        )
        self.isRecording = true
        self.recordingStartTime = .zero
        self.recordingTimelineOrigin = nil
        resolve(nil)
      } catch {
        self.cancelRecordingAndDeleteTemporaryFiles()
        reject("native_camera_start_recording_failed", error.localizedDescription, error)
      }
    }
  }

  /// 停止接收视频帧，完成 MP4 写入并返回生成文件信息。
  func stopVideoRecording(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isRecording else {
        resolve([])
        return
      }

      self.isRecording = false
      self.videoOutputQueue.sync {}
      let rearWriter = self.rearAssetWriter
      let frontWriter = self.frontAssetWriter
      let combinedWriter = self.combinedAssetWriter
      let rearURL = self.rearRecordingURL
      let frontURL = self.frontRecordingURL
      let combinedURL = self.combinedRecordingURL
      let elapsed = self.recordingStartedAt.map { CFAbsoluteTimeGetCurrent() - $0 } ?? 0
      let frameDuration = CMTime(value: 1, timescale: 30)
      let wallClockEndTime = CMTime(
        seconds: max(elapsed, 0) + CMTimeGetSeconds(frameDuration),
        preferredTimescale: 600
      )
      let rearEndTime =
        self.rearLastFrameTime.map {
          min(CMTimeAdd($0, frameDuration), wallClockEndTime)
        } ?? wallClockEndTime
      let frontEndTime =
        self.frontLastFrameTime.map {
          min(CMTimeAdd($0, frameDuration), wallClockEndTime)
        } ?? wallClockEndTime
      let combinedEndTime =
        self.combinedLastFrameTime.map {
          min(CMTimeAdd($0, frameDuration), wallClockEndTime)
        } ?? wallClockEndTime

      if rearWriter?.status == .writing {
        rearWriter?.endSession(atSourceTime: rearEndTime)
        self.rearAssetWriterInput?.markAsFinished()
        self.rearAudioWriterInput?.markAsFinished()
      }
      if frontWriter?.status == .writing {
        frontWriter?.endSession(atSourceTime: frontEndTime)
        self.frontAssetWriterInput?.markAsFinished()
        self.frontAudioWriterInput?.markAsFinished()
      }
      if combinedWriter?.status == .writing {
        combinedWriter?.endSession(atSourceTime: combinedEndTime)
        self.combinedAssetWriterInput?.markAsFinished()
        self.combinedAudioWriterInput?.markAsFinished()
      }

      let group = DispatchGroup()
      let finishState = NativeDualCameraRecordingFinishState()

      if let rearWriter, rearWriter.status == .writing {
        group.enter()
        rearWriter.finishWriting {
          if rearWriter.status == .failed || rearWriter.status == .cancelled {
            finishState.record(rearWriter.error)
          }
          group.leave()
        }
      }

      if let frontWriter, frontWriter.status == .writing {
        group.enter()
        frontWriter.finishWriting {
          if frontWriter.status == .failed || frontWriter.status == .cancelled {
            finishState.record(frontWriter.error)
          }
          group.leave()
        }
      }

      if let combinedWriter, combinedWriter.status == .writing {
        group.enter()
        combinedWriter.finishWriting {
          if combinedWriter.status == .failed || combinedWriter.status == .cancelled {
            finishState.record(combinedWriter.error)
          }
          group.leave()
        }
      }

      group.wait()

      for writer in [combinedWriter, rearWriter, frontWriter].compactMap({ $0 }) {
        if writer.status == .failed || writer.status == .cancelled {
          finishState.record(writer.error ?? self.composerError("视频写入器失败。"))
        }
      }

      var finishError = finishState.error

      let rearPath = rearURL?.path
      let frontPath = frontURL?.path
      let combinedPath = combinedURL?.path
      let rearFrames = self.rearWrittenFrameCount
      let frontFrames = self.frontWrittenFrameCount
      let rearDropped = self.rearDroppedFrameCount
      let frontDropped = self.frontDroppedFrameCount
      let combinedFrames = self.combinedWrittenFrameCount
      let combinedDropped = self.combinedDroppedFrameCount
      let startDeltaMs = self.frameDeltaMilliseconds(
        self.rearFirstFrameTime,
        self.frontFirstFrameTime
      )
      let endDeltaMs = self.frameDeltaMilliseconds(
        self.rearLastFrameTime,
        self.frontLastFrameTime
      )
      self.resetRecordingState()

      if finishError == nil, combinedFrames == 0 {
        finishError = self.composerError("实时视频没有生成有效画面。")
      }

      if let finishError {
        [rearURL, frontURL, combinedURL].compactMap { $0 }.forEach {
          try? FileManager.default.removeItem(at: $0)
        }
        reject("native_camera_stop_recording_failed", finishError.localizedDescription, finishError)
        return
      }

      var payload: [[String: String]] = []
      if let combinedPath {
        payload.append(["side": "combined", "filePath": combinedPath])
      }
      if let rearPath {
        payload.append(["side": "rear", "filePath": rearPath])
      }
      if let frontPath {
        payload.append(["side": "front", "filePath": frontPath])
      }

      let rearBytes =
        rearPath.flatMap { path -> Int64? in
          guard
            let value = try? FileManager.default.attributesOfItem(atPath: path)[.size] as? NSNumber
          else {
            return nil
          }
          return value.int64Value
        } ?? 0
      let frontBytes =
        frontPath.flatMap { path -> Int64? in
          guard
            let value = try? FileManager.default.attributesOfItem(atPath: path)[.size] as? NSNumber
          else {
            return nil
          }
          return value.int64Value
        } ?? 0
      NSLog(
        "双摄录像统计：时长=%.2f秒 合成帧=%ld 丢弃合成帧=%ld 后摄帧=%ld 前摄帧=%ld 后摄丢帧=%ld 前摄丢帧=%ld 起始偏差=%.1f毫秒 结束偏差=%.1f毫秒 后摄文件=%.1fMB 前摄文件=%.1fMB",
        elapsed,
        combinedFrames,
        combinedDropped,
        rearFrames,
        frontFrames,
        rearDropped,
        frontDropped,
        startDeltaMs,
        endDeltaMs,
        Double(rearBytes) / 1_048_576,
        Double(frontBytes) / 1_048_576
      )

      resolve(payload)
    }
  }

  /// 校准相机时间戳，并将当前帧写入单路原始流或合成视频。
  func appendVideoBuffer(
    sampleBuffer: CMSampleBuffer,
    side: String,
    presentationTime: CMTime
  ) {
    guard isRecording else { return }
    guard CMSampleBufferDataIsReady(sampleBuffer) else { return }

    guard
      let timelineOrigin = resolveRecordingTimelineOrigin(
        for: side,
        sampleBuffer: sampleBuffer,
        presentationTime: presentationTime
      )
    else {
      recordDroppedFrame(side: side)
      return
    }

    let relativeTime = CMTimeSubtract(presentationTime, timelineOrigin)
    guard relativeTime.isValid, relativeTime >= .zero else {
      return
    }

    // 将相机时间戳限制在真实录像窗口内，避免时间戳跳变导致短视频时长异常。
    if let recordingStartedAt {
      let elapsed = CFAbsoluteTimeGetCurrent() - recordingStartedAt
      let allowedEnd = CMTime(
        seconds: max(elapsed, 0) + (1.0 / 30.0),
        preferredTimescale: 600
      )
      guard relativeTime <= allowedEnd else {
        recordDroppedFrame(side: side)
        return
      }
    }

    if recordingStartTime == nil || recordingStartTime == .zero {
      recordingStartTime = relativeTime
    }

    if recordingKeepSeparateStreams {
      appendRawVideoBuffer(
        sampleBuffer,
        side: side,
        presentationTime: relativeTime
      )
    }

    guard side == recordingPrimaryCamera else { return }
    appendCombinedVideoFrame(presentationTime: relativeTime)
  }

  func appendRawVideoBuffer(
    _ sampleBuffer: CMSampleBuffer,
    side: String,
    presentationTime: CMTime
  ) {
    let writerInput = side == "rear" ? rearAssetWriterInput : frontAssetWriterInput
    let writer = side == "rear" ? rearAssetWriter : frontAssetWriter
    guard let writer, let writerInput else { return }

    if writer.status == .unknown {
      guard writer.startWriting() else {
        recordDroppedFrame(side: side)
        return
      }
      writer.startSession(atSourceTime: .zero)
    }

    guard writer.status == .writing, writerInput.isReadyForMoreMediaData else {
      recordDroppedFrame(side: side)
      return
    }

    guard
      let retimedSampleBuffer = makeRetimedSampleBuffer(
        from: sampleBuffer,
        presentationTime: presentationTime
      )
    else {
      recordDroppedFrame(side: side)
      NSLog(
        "原生双摄视频：样本时间戳校准失败，摄像头=%@ 相对时间=%.3f",
        side,
        CMTimeGetSeconds(presentationTime)
      )
      return
    }

    if writerInput.append(retimedSampleBuffer) {
      recordWrittenFrame(side: side, presentationTime: presentationTime)
    } else {
      recordDroppedFrame(side: side)
      NSLog(
        "原生双摄视频：写入单路视频帧失败，摄像头=%@ 状态=%ld 错误=%@ 相对时间=%.3f",
        side,
        writer.status.rawValue,
        writer.error?.localizedDescription ?? "nil",
        CMTimeGetSeconds(presentationTime)
      )
    }
  }

  /// GPU 合成当前前后摄画面，并追加到合成视频文件。
  func appendCombinedVideoFrame(presentationTime: CMTime) {
    guard
      let writer = combinedAssetWriter,
      let input = combinedAssetWriterInput,
      let adaptor = combinedPixelBufferAdaptor,
      let rearBuffer = latestRearPixelBuffer,
      let frontBuffer = isDualCameraActive ? latestFrontPixelBuffer : rearBuffer
    else {
      combinedDroppedFrameCount += 1
      return
    }

    if writer.status == .unknown {
      guard writer.startWriting() else {
        combinedDroppedFrameCount += 1
        return
      }
      writer.startSession(atSourceTime: .zero)
    }

    guard writer.status == .writing, input.isReadyForMoreMediaData else {
      combinedDroppedFrameCount += 1
      return
    }
    guard let pool = adaptor.pixelBufferPool else {
      combinedDroppedFrameCount += 1
      return
    }

    var outputBuffer: CVPixelBuffer?
    guard
      CVPixelBufferPoolCreatePixelBuffer(
        kCFAllocatorDefault,
        pool,
        &outputBuffer
      ) == kCVReturnSuccess, let outputBuffer
    else {
      combinedDroppedFrameCount += 1
      return
    }

    autoreleasepool {
      let image = makeRealtimeComposedImage(
        rearBuffer: rearBuffer,
        frontBuffer: frontBuffer
      )
      NativeDualCameraViewManager.ciContext.render(
        image,
        to: outputBuffer,
        bounds: CGRect(origin: .zero, size: recordingOutputSize),
        colorSpace: NativeDualCameraViewManager.colorSpace
      )
    }

    if adaptor.append(outputBuffer, withPresentationTime: presentationTime) {
      combinedWrittenFrameCount += 1
      combinedLastFrameTime = presentationTime
    } else {
      combinedDroppedFrameCount += 1
      NSLog(
        "原生双摄视频：写入合成视频帧失败，状态=%ld 错误=%@ 时间=%.3f",
        writer.status.rawValue,
        writer.error?.localizedDescription ?? "nil",
        CMTimeGetSeconds(presentationTime)
      )
    }
  }

  /// 根据录像布局生成当前时刻的前后摄合成图像。
  func makeRealtimeComposedImage(
    rearBuffer: CVPixelBuffer,
    frontBuffer: CVPixelBuffer
  ) -> CIImage {
    let rearImage = normalizedImage(from: rearBuffer, mirrored: false)
    let frontImage = normalizedImage(from: frontBuffer, mirrored: false)
    let primaryImage = recordingPrimaryCamera == "front" ? frontImage : rearImage
    let secondaryImage = recordingPrimaryCamera == "front" ? rearImage : frontImage
    let outputRect = CGRect(origin: .zero, size: recordingOutputSize)

    if recordingLayout == "split", isDualCameraActive {
      let topRect = ciRect(
        fromTopLeft: CGRect(
          x: 0,
          y: 0,
          width: recordingOutputSize.width,
          height: recordingOutputSize.height / 2
        ),
        outputSize: recordingOutputSize
      )
      let bottomRect = ciRect(
        fromTopLeft: CGRect(
          x: 0,
          y: recordingOutputSize.height / 2,
          width: recordingOutputSize.width,
          height: recordingOutputSize.height / 2
        ),
        outputSize: recordingOutputSize
      )
      return aspectFill(secondaryImage, in: bottomRect)
        .composited(over: aspectFill(primaryImage, in: topRect))
        .cropped(to: outputRect)
    }

    let mainLayer = aspectFill(primaryImage, in: outputRect)
    let mappedPip = mapPipRect(
      recordingPipRect,
      from: recordingPreviewSize,
      to: recordingOutputSize
    )
    return renderPip(
      image: secondaryImage,
      over: mainLayer,
      in: ciRect(fromTopLeft: mappedPip, outputSize: recordingOutputSize),
      outputSize: recordingOutputSize,
      previewSize: recordingPreviewSize,
      pipBorderVisible: recordingPipBorderVisible
    ).cropped(to: outputRect)
  }

  /// 完成或取消录像后释放写入器引用，清空本次录像状态；文件删除由调用方负责。
  func resetRecordingState() {
    if let signpostID = recordingSignpostID {
      os_signpost(.end, log: Self.performanceLog, name: "录像", signpostID: signpostID)
    }
    rearAssetWriter = nil
    frontAssetWriter = nil
    combinedAssetWriter = nil
    rearAssetWriterInput = nil
    frontAssetWriterInput = nil
    combinedAssetWriterInput = nil
    rearAudioWriterInput = nil
    frontAudioWriterInput = nil
    combinedAudioWriterInput = nil
    rearPixelBufferAdaptor = nil
    frontPixelBufferAdaptor = nil
    combinedPixelBufferAdaptor = nil
    rearRecordingURL = nil
    frontRecordingURL = nil
    combinedRecordingURL = nil
    recordingKeepSeparateStreams = false
    recordingPrimaryCamera = "rear"
    recordingLayout = "pip"
    recordingPipRect = .zero
    recordingPreviewSize = .zero
    recordingOutputSize = CGSize(width: 1080, height: 1920)
    recordingPipBorderVisible = true
    recordingStartTime = nil
    recordingTimelineOrigin = nil
    recordingStartedAt = nil
    recordingSignpostID = nil
    resetRecordingMetrics()
    isRecording = false
  }

  func resetRecordingMetrics() {
    rearWrittenFrameCount = 0
    frontWrittenFrameCount = 0
    rearDroppedFrameCount = 0
    frontDroppedFrameCount = 0
    rearFirstFrameTime = nil
    frontFirstFrameTime = nil
    rearLastFrameTime = nil
    frontLastFrameTime = nil
    combinedLastFrameTime = nil
    combinedWrittenFrameCount = 0
    combinedDroppedFrameCount = 0
    rearWarmupFrameCount = 0
    frontWarmupFrameCount = 0
    rearTimelineCandidate = nil
    frontTimelineCandidate = nil
  }

  /// 等待所需摄像头的有效首帧到齐，选择共同时间轴起点，避免首次录像黑帧。
  func resolveRecordingTimelineOrigin(
    for side: String,
    sampleBuffer: CMSampleBuffer,
    presentationTime: CMTime
  ) -> CMTime? {
    if let origin = recordingTimelineOrigin {
      return origin
    }

    let warmupFrameTarget = 3
    if side == "rear" {
      rearWarmupFrameCount += 1
      guard rearWarmupFrameCount >= warmupFrameTarget else { return nil }
      guard isUsableOpeningFrame(sampleBuffer) else { return nil }
      rearTimelineCandidate = rearTimelineCandidate ?? presentationTime
    } else {
      frontWarmupFrameCount += 1
      guard frontWarmupFrameCount >= warmupFrameTarget else { return nil }
      guard isUsableOpeningFrame(sampleBuffer) else { return nil }
      frontTimelineCandidate = frontTimelineCandidate ?? presentationTime
    }

    let origin: CMTime
    if isDualCameraActive {
      guard let rearTimelineCandidate, let frontTimelineCandidate else { return nil }
      origin =
        CMTimeCompare(rearTimelineCandidate, frontTimelineCandidate) >= 0
        ? rearTimelineCandidate
        : frontTimelineCandidate
    } else {
      guard let rearTimelineCandidate else { return nil }
      origin = rearTimelineCandidate
    }

    recordingTimelineOrigin = origin
    return origin
  }

  /// 对 BGRA 帧稀疏采样亮度，过滤相机预热阶段近乎全黑的开场帧。
  func isUsableOpeningFrame(_ sampleBuffer: CMSampleBuffer) -> Bool {
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return false }
    CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

    guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else { return false }
    let width = CVPixelBufferGetWidth(pixelBuffer)
    let height = CVPixelBufferGetHeight(pixelBuffer)
    let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
    guard width > 0, height > 0, bytesPerRow >= width * 4 else { return false }

    let bytes = baseAddress.assumingMemoryBound(to: UInt8.self)
    let sampleColumns = 8
    let sampleRows = 8
    var brightnessTotal = 0
    for row in 0..<sampleRows {
      let y = min(height - 1, (row * 2 + 1) * height / (sampleRows * 2))
      for column in 0..<sampleColumns {
        let x = min(width - 1, (column * 2 + 1) * width / (sampleColumns * 2))
        let offset = y * bytesPerRow + x * 4
        brightnessTotal += Int(bytes[offset])
        brightnessTotal += Int(bytes[offset + 1])
        brightnessTotal += Int(bytes[offset + 2])
      }
    }

    let channelCount = sampleColumns * sampleRows * 3
    return brightnessTotal / channelCount >= 4
  }

  func recordWrittenFrame(side: String, presentationTime: CMTime) {
    if side == "rear" {
      rearWrittenFrameCount += 1
      rearFirstFrameTime = rearFirstFrameTime ?? presentationTime
      rearLastFrameTime = presentationTime
    } else {
      frontWrittenFrameCount += 1
      frontFirstFrameTime = frontFirstFrameTime ?? presentationTime
      frontLastFrameTime = presentationTime
    }
  }

  func recordDroppedFrame(side: String) {
    if side == "rear" {
      rearDroppedFrameCount += 1
    } else {
      frontDroppedFrameCount += 1
    }
  }

  func frameDeltaMilliseconds(_ first: CMTime?, _ second: CMTime?) -> Double {
    guard let first, let second, first.isValid, second.isValid else { return -1 }
    return abs(CMTimeGetSeconds(CMTimeSubtract(first, second))) * 1_000
  }

  /// 取消未完成的录像，并删除所有关联的临时文件。
  func cancelRecordingAndDeleteTemporaryFiles() {
    let wasRecording =
      isRecording || rearAssetWriter != nil || frontAssetWriter != nil || combinedAssetWriter != nil
    let urls = [rearRecordingURL, frontRecordingURL, combinedRecordingURL].compactMap { $0 }

    isRecording = false
    rearAssetWriter?.cancelWriting()
    frontAssetWriter?.cancelWriting()
    combinedAssetWriter?.cancelWriting()
    resetRecordingState()

    urls.forEach {
      try? FileManager.default.removeItem(at: $0)
    }

    if wasRecording {
      NSLog("双摄录像已取消，临时文件已清理")
    }
  }
}
