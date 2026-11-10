// 相机预览帧管线：接收音视频采样、更新最新画面并通知预览就绪状态。
import AVFoundation
import Foundation

extension NativeDualCameraView {
  /// 分发相机采样：更新最新视频帧，并交给音频或录像管线处理。
  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    if output === audioDataOutput {
      appendAudioSampleBuffer(sampleBuffer)
      return
    }

    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return
    }
    let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)

    if output === rearVideoOutput {
      latestRearPixelBuffer = pixelBuffer
      emitPreviewReadyIfNeeded()
      scheduleStableReadyIfNeeded()
      appendVideoBuffer(
        sampleBuffer: sampleBuffer,
        side: "rear",
        presentationTime: presentationTime
      )
    } else if output === frontVideoOutput {
      latestFrontPixelBuffer = pixelBuffer
      emitPreviewReadyIfNeeded()
      scheduleStableReadyIfNeeded()
      appendVideoBuffer(
        sampleBuffer: sampleBuffer,
        side: "front",
        presentationTime: presentationTime
      )
    }
  }

  /// 双摄首帧到齐并稳定后，向 JS 发送稳定就绪事件。
  func scheduleStableReadyIfNeeded() {
    guard !hasEmittedStableReady else { return }
    guard latestRearPixelBuffer != nil else { return }
    if isDualCameraActive, latestFrontPixelBuffer == nil { return }
    guard isRunning else { return }

    stableReadyWorkItem?.cancel()
    let workItem = DispatchWorkItem { [weak self] in
      guard let self else { return }
      guard self.isRunning else { return }
      guard self.latestRearPixelBuffer != nil else { return }
      if self.isDualCameraActive, self.latestFrontPixelBuffer == nil { return }
      guard !self.hasEmittedStableReady else { return }
      self.hasEmittedStableReady = true
      self.emitReady(stable: true)
    }
    stableReadyWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: workItem)
  }

  /// 首次取得所需摄像头画面时，通知 JS 预览可以显示。
  func emitPreviewReadyIfNeeded() {
    guard !hasEmittedPreviewReady else { return }
    guard latestRearPixelBuffer != nil else { return }
    if isDualCameraActive, latestFrontPixelBuffer == nil { return }
    hasEmittedPreviewReady = true
    emitReady(stable: false)
  }
}
