// 原生音频管线：检查麦克风采集状态，并校准音频时间戳后写入录像文件。
import AVFoundation
import Foundation

extension NativeDualCameraView {
  /// 确认麦克风权限及采集输入输出均已就绪。
  func ensureAudioCaptureConfigured() throws {
    guard AVCaptureDevice.authorizationStatus(for: .audio) == .authorized else {
      throw composerError("没有获得麦克风权限。")
    }
    guard audioDataOutput != nil, audioDeviceInput != nil else {
      throw composerError("麦克风采集尚未准备好。")
    }
  }

  /// 将麦克风样本映射到录像时间轴，并写入合成或独立视频流。
  func appendAudioSampleBuffer(_ sampleBuffer: CMSampleBuffer) {
    guard isRecording else { return }
    guard CMSampleBufferDataIsReady(sampleBuffer) else { return }

    let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    guard let timelineOrigin = recordingTimelineOrigin else {
      return
    }

    let relativeTime = CMTimeSubtract(presentationTime, timelineOrigin)
    guard relativeTime.isValid, relativeTime >= .zero else { return }
    guard
      let retimedSampleBuffer = makeRetimedSampleBuffer(
        from: sampleBuffer,
        presentationTime: relativeTime
      )
    else {
      return
    }

    appendAudioSampleBuffer(
      retimedSampleBuffer,
      to: combinedAssetWriter,
      input: combinedAudioWriterInput
    )
    guard recordingKeepSeparateStreams else { return }
    appendAudioSampleBuffer(
      retimedSampleBuffer,
      to: rearAssetWriter,
      input: rearAudioWriterInput
    )
    appendAudioSampleBuffer(
      retimedSampleBuffer,
      to: frontAssetWriter,
      input: frontAudioWriterInput
    )
  }

  func appendAudioSampleBuffer(
    _ sampleBuffer: CMSampleBuffer,
    to writer: AVAssetWriter?,
    input: AVAssetWriterInput?
  ) {
    guard let writer, let input else { return }

    if writer.status == .unknown {
      guard writer.startWriting() else {
        NSLog(
          "原生双摄音频：启动写入器失败，状态=%ld 错误=%@",
          writer.status.rawValue,
          writer.error?.localizedDescription ?? "nil"
        )
        return
      }
      writer.startSession(atSourceTime: .zero)
    }

    guard writer.status == .writing, input.isReadyForMoreMediaData else {
      return
    }

    if !input.append(sampleBuffer) {
      NSLog(
        "原生双摄音频：写入音频样本失败，状态=%ld 错误=%@ 时间=%.3f",
        writer.status.rawValue,
        writer.error?.localizedDescription ?? "nil",
        CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
      )
    }
  }

  /// 复制音视频样本并平移时间戳，保留样本内各时间戳之间的相对间隔。
  func makeRetimedSampleBuffer(
    from sampleBuffer: CMSampleBuffer,
    presentationTime: CMTime
  ) -> CMSampleBuffer? {
    let sampleCount = CMSampleBufferGetNumSamples(sampleBuffer)
    guard sampleCount > 0 else { return nil }

    var timingInfo = [CMSampleTimingInfo](
      repeating: CMSampleTimingInfo(
        duration: .invalid, presentationTimeStamp: .invalid, decodeTimeStamp: .invalid),
      count: sampleCount
    )
    let status = CMSampleBufferGetSampleTimingInfoArray(
      sampleBuffer,
      entryCount: sampleCount,
      arrayToFill: &timingInfo,
      entriesNeededOut: nil
    )
    guard status == noErr else { return nil }

    let basePresentation = timingInfo[0].presentationTimeStamp
    for index in timingInfo.indices {
      if timingInfo[index].presentationTimeStamp.isValid {
        let delta = CMTimeSubtract(timingInfo[index].presentationTimeStamp, basePresentation)
        timingInfo[index].presentationTimeStamp = CMTimeAdd(presentationTime, delta)
      } else {
        timingInfo[index].presentationTimeStamp = presentationTime
      }

      if timingInfo[index].decodeTimeStamp.isValid {
        let delta = CMTimeSubtract(timingInfo[index].decodeTimeStamp, basePresentation)
        timingInfo[index].decodeTimeStamp = CMTimeAdd(presentationTime, delta)
      } else {
        timingInfo[index].decodeTimeStamp = .invalid
      }
    }

    var retimedBuffer: CMSampleBuffer?
    let copyStatus = CMSampleBufferCreateCopyWithNewTiming(
      allocator: kCFAllocatorDefault,
      sampleBuffer: sampleBuffer,
      sampleTimingEntryCount: sampleCount,
      sampleTimingArray: &timingInfo,
      sampleBufferOut: &retimedBuffer
    )
    guard copyStatus == noErr else { return nil }
    return retimedBuffer
  }
}
