// 视频写入器工厂：创建合成视频及可选独立视频流所需的 AVAssetWriter 输入。
import AVFoundation
import Foundation

extension NativeDualCameraView {
  /// 按录制模式创建合成流和可选的前、后摄独立流写入器。
  func prepareVideoWriters(
    outputSize: CGSize,
    rawOutputSize: CGSize,
    frameRate: Int,
    audioEnabled: Bool,
    audioChannels: Int,
    audioSampleRate: Double,
    keepSeparateStreams: Bool
  ) throws {
    let combinedURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("native-combined-\(UUID().uuidString).mp4")
    let combinedBundle = try makeWriterBundle(
      url: combinedURL,
      outputSize: outputSize,
      frameRate: frameRate
    )
    combinedAssetWriter = combinedBundle.writer
    combinedAssetWriterInput = combinedBundle.input
    combinedPixelBufferAdaptor = combinedBundle.adaptor
    combinedAudioWriterInput =
      audioEnabled
      ? makeAudioWriterInput(
        writer: combinedBundle.writer,
        channels: audioChannels,
        sampleRate: audioSampleRate
      )
      : nil
    combinedRecordingURL = combinedURL

    guard keepSeparateStreams else {
      rearAssetWriter = nil
      frontAssetWriter = nil
      rearAssetWriterInput = nil
      frontAssetWriterInput = nil
      rearAudioWriterInput = nil
      frontAudioWriterInput = nil
      rearPixelBufferAdaptor = nil
      frontPixelBufferAdaptor = nil
      rearRecordingURL = nil
      frontRecordingURL = nil
      return
    }

    let rearURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("native-rear-\(UUID().uuidString).mp4")
    let frontURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("native-front-\(UUID().uuidString).mp4")
    try? FileManager.default.removeItem(at: rearURL)
    try? FileManager.default.removeItem(at: frontURL)

    let rearBundle = try makeWriterBundle(
      url: rearURL, outputSize: rawOutputSize, frameRate: frameRate)
    rearAssetWriter = rearBundle.writer
    rearAssetWriterInput = rearBundle.input
    rearPixelBufferAdaptor = rearBundle.adaptor
    rearAudioWriterInput =
      audioEnabled
      ? makeAudioWriterInput(
        writer: rearBundle.writer,
        channels: audioChannels,
        sampleRate: audioSampleRate
      )
      : nil
    rearRecordingURL = rearURL

    if isDualCameraActive {
      let frontBundle = try makeWriterBundle(
        url: frontURL, outputSize: rawOutputSize, frameRate: frameRate)
      frontAssetWriter = frontBundle.writer
      frontAssetWriterInput = frontBundle.input
      frontPixelBufferAdaptor = frontBundle.adaptor
      frontAudioWriterInput =
        audioEnabled
        ? makeAudioWriterInput(
          writer: frontBundle.writer,
          channels: audioChannels,
          sampleRate: audioSampleRate
        )
        : nil
      frontRecordingURL = frontURL
    } else {
      frontAssetWriter = nil
      frontAssetWriterInput = nil
      frontPixelBufferAdaptor = nil
      frontAudioWriterInput = nil
      frontRecordingURL = nil
    }
  }

  /// 创建带 H.264 编码和像素缓冲池的 MP4 视频写入器。
  func makeWriterBundle(
    url: URL,
    outputSize: CGSize,
    frameRate: Int
  ) throws -> (
    writer: AVAssetWriter,
    input: AVAssetWriterInput,
    adaptor: AVAssetWriterInputPixelBufferAdaptor
  ) {
    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    let input = AVAssetWriterInput(
      mediaType: .video,
      outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: Int(outputSize.width),
        AVVideoHeightKey: Int(outputSize.height),
        AVVideoCompressionPropertiesKey: [
          AVVideoAverageBitRateKey: max(4_000_000, Int(outputSize.width * outputSize.height * 4)),
          AVVideoExpectedSourceFrameRateKey: frameRate,
          AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        ],
      ]
    )
    input.expectsMediaDataInRealTime = true
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: input,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: Int(outputSize.width),
        kCVPixelBufferHeightKey as String: Int(outputSize.height),
        kCVPixelBufferIOSurfacePropertiesKey as String: [:],
      ]
    )

    guard writer.canAdd(input) else {
      throw composerError("无法添加视频写入输入。")
    }
    writer.add(input)

    return (writer, input, adaptor)
  }

  /// 为指定的视频写入器创建 AAC 音频输入。
  func makeAudioWriterInput(
    writer: AVAssetWriter,
    channels: Int,
    sampleRate: Double
  ) -> AVAssetWriterInput? {
    let safeChannels = max(1, min(channels, 2))
    let safeSampleRate = max(22_050, sampleRate)
    let bitRate = safeChannels == 1 ? 64_000 : 128_000
    let input = AVAssetWriterInput(
      mediaType: .audio,
      outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: safeSampleRate,
        AVNumberOfChannelsKey: safeChannels,
        AVEncoderBitRateKey: bitRate,
      ]
    )
    input.expectsMediaDataInRealTime = true
    guard writer.canAdd(input) else {
      return nil
    }
    writer.add(input)
    return input
  }
}
