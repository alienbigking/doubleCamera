// 双摄原生预览视图：维护相机会话、共享状态与 React Native 事件，并协调各处理管线。
import AVFoundation
import React
import UIKit
import os

final class NativeDualCameraView: UIView, AVCaptureVideoDataOutputSampleBufferDelegate,
  AVCaptureAudioDataOutputSampleBufferDelegate
{
  let sessionQueue = DispatchQueue(label: "com.doubleCamera.nativeCamera.session")
  let videoOutputQueue = DispatchQueue(label: "com.doubleCamera.nativeCamera.videoOutput")
  static let performanceLog = OSLog(
    subsystem: "com.skqy.doublecamera.app",
    category: "DualVideo"
  )
  var session: AVCaptureSession?
  var rearDeviceInput: AVCaptureDeviceInput?
  var frontDeviceInput: AVCaptureDeviceInput?
  let primaryContainer = UIView()
  let secondaryContainer = UIView()
  let splitDivider = UIView()
  var rearPreviewLayer: AVCaptureVideoPreviewLayer?
  var frontPreviewLayer: AVCaptureVideoPreviewLayer?
  var rearVideoOutput: AVCaptureVideoDataOutput?
  var frontVideoOutput: AVCaptureVideoDataOutput?
  var audioDeviceInput: AVCaptureDeviceInput?
  var audioDataOutput: AVCaptureAudioDataOutput?
  var latestRearPixelBuffer: CVPixelBuffer?
  var latestFrontPixelBuffer: CVPixelBuffer?
  var rearAssetWriter: AVAssetWriter?
  var frontAssetWriter: AVAssetWriter?
  var rearAssetWriterInput: AVAssetWriterInput?
  var frontAssetWriterInput: AVAssetWriterInput?
  var rearAudioWriterInput: AVAssetWriterInput?
  var frontAudioWriterInput: AVAssetWriterInput?
  var rearPixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
  var frontPixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
  var combinedAssetWriter: AVAssetWriter?
  var combinedAssetWriterInput: AVAssetWriterInput?
  var combinedAudioWriterInput: AVAssetWriterInput?
  var combinedPixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
  let recordingStateLock = NSLock()
  var _recordingStartTime: CMTime?
  var _recordingTimelineOrigin: CMTime?
  var _isRecording = false
  var rearRecordingURL: URL?
  var frontRecordingURL: URL?
  var combinedRecordingURL: URL?
  var recordingKeepSeparateStreams = false
  var recordingPrimaryCamera = "rear"
  var recordingLayout = "pip"
  var recordingPipRect = CGRect.zero
  var recordingPreviewSize = CGSize.zero
  var recordingOutputSize = CGSize(width: 1080, height: 1920)
  var recordingPipBorderVisible = true
  var recordingStartedAt: CFAbsoluteTime?
  var recordingSignpostID: OSSignpostID?
  var rearWrittenFrameCount = 0
  var frontWrittenFrameCount = 0
  var rearDroppedFrameCount = 0
  var frontDroppedFrameCount = 0
  var rearFirstFrameTime: CMTime?
  var frontFirstFrameTime: CMTime?
  var rearLastFrameTime: CMTime?
  var frontLastFrameTime: CMTime?
  var combinedLastFrameTime: CMTime?
  var combinedWrittenFrameCount = 0
  var combinedDroppedFrameCount = 0
  var rearWarmupFrameCount = 0
  var frontWarmupFrameCount = 0
  var rearTimelineCandidate: CMTime?
  var frontTimelineCandidate: CMTime?
  var isConfigured = false
  var isRunning = false
  var isStarting = false
  var isDualCameraActive = false
  var hasPrewarmedProcessing = false
  var hasEmittedPreviewReady = false
  var hasEmittedStableReady = false
  var stableReadyWorkItem: DispatchWorkItem?

  @objc var onReady: RCTDirectEventBlock?
  @objc var onError: RCTDirectEventBlock?

  @objc var active: Bool = false {
    didSet {
      active ? startIfPossible() : stop()
    }
  }

  // 保留这些导出属性，确保现有 JS 相机组件可以正常挂载。
  @objc var layoutMode: NSString = "pip" {
    didSet {
      scheduleLayoutUpdate()
    }
  }
  @objc var primaryCamera: NSString = "rear" {
    didSet {
      scheduleLayoutUpdate()
    }
  }
  @objc var pipX: NSNumber = 16 {
    didSet {
      scheduleLayoutUpdate()
    }
  }
  @objc var pipY: NSNumber = 88 {
    didSet {
      scheduleLayoutUpdate()
    }
  }
  @objc var pipWidth: NSNumber = 142 {
    didSet {
      scheduleLayoutUpdate()
    }
  }
  @objc var pipHeight: NSNumber = 184 {
    didSet {
      scheduleLayoutUpdate()
    }
  }
  @objc var pipBorderVisible: Bool = true {
    didSet {
      scheduleLayoutUpdate()
    }
  }
  @objc var frameCaptureEnabled: Bool = false
  @objc var dualPreviewEnabled: Bool = false

  var recordingStartTime: CMTime? {
    get {
      recordingStateLock.lock()
      defer { recordingStateLock.unlock() }
      return _recordingStartTime
    }
    set {
      recordingStateLock.lock()
      _recordingStartTime = newValue
      recordingStateLock.unlock()
    }
  }

  var recordingTimelineOrigin: CMTime? {
    get {
      recordingStateLock.lock()
      defer { recordingStateLock.unlock() }
      return _recordingTimelineOrigin
    }
    set {
      recordingStateLock.lock()
      _recordingTimelineOrigin = newValue
      recordingStateLock.unlock()
    }
  }

  var isRecording: Bool {
    get {
      recordingStateLock.lock()
      defer { recordingStateLock.unlock() }
      return _isRecording
    }
    set {
      recordingStateLock.lock()
      _isRecording = newValue
      recordingStateLock.unlock()
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    configureHostView()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    configureHostView()
  }

  func configureHostView() {
    backgroundColor = .black
    clipsToBounds = true

    primaryContainer.backgroundColor = .black
    primaryContainer.clipsToBounds = true

    secondaryContainer.backgroundColor = .black
    secondaryContainer.clipsToBounds = true
    secondaryContainer.isHidden = true

    splitDivider.backgroundColor = UIColor.white.withAlphaComponent(0.08)
    splitDivider.isHidden = true

    addSubview(primaryContainer)
    addSubview(splitDivider)
    addSubview(secondaryContainer)
  }

  deinit {
    rearAssetWriter?.cancelWriting()
    frontAssetWriter?.cancelWriting()
    combinedAssetWriter?.cancelWriting()
    [rearRecordingURL, frontRecordingURL, combinedRecordingURL].compactMap { $0 }.forEach {
      try? FileManager.default.removeItem(at: $0)
    }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    window == nil ? stop() : startIfPossible()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    applyLayout()
    startIfPossible()
  }

  /// 确保视图已挂载且尺寸有效后，在会话队列启动相机会话。
  func startIfPossible() {
    guard active else { return }
    guard window != nil else { return }
    guard bounds.width > 0, bounds.height > 0 else { return }

    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard !self.isRunning, !self.isStarting else { return }

      self.isStarting = true
      if !self.isConfigured {
        self.configure()
      }

      guard let session = self.session, self.isConfigured else {
        self.isStarting = false
        return
      }

      session.startRunning()
      self.isRunning = true
      self.isStarting = false
      self.prewarmProcessingPipelineIfNeeded()
    }
  }

  /// 停止会话并释放最近帧，取消录像并清理临时文件。
  func stop() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      self.isStarting = false
      self.stableReadyWorkItem?.cancel()
      self.stableReadyWorkItem = nil
      self.hasEmittedPreviewReady = false
      self.hasEmittedStableReady = false

      self.isRecording = false
      self.videoOutputQueue.sync {}
      self.cancelRecordingAndDeleteTemporaryFiles()

      if self.session?.isRunning == true {
        self.session?.stopRunning()
      }

      self.isRunning = false
      self.latestRearPixelBuffer = nil
      self.latestFrontPixelBuffer = nil
    }
  }

  func composerError(_ message: String) -> NSError {
    NSError(
      domain: "NativeDualCameraView",
      code: -1,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }

  func emitReady(stable: Bool) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.onReady?([
        "rearFrameReady": true,
        "frontFrameReady": self.isDualCameraActive,
        "stableReady": stable,
      ])
    }
  }

  func emitError(_ message: String) {
    NSLog("原生双摄预览错误：\(message)")
    DispatchQueue.main.async { [weak self] in
      self?.onError?(["message": message])
    }
  }
}
