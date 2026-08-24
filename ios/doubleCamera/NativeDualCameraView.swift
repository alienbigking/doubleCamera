import AVFoundation
import os
import React
import UIKit

@objc(NativeCameraTestModule)
final class NativeCameraTestModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(showMinimalCamera:rejecter:)
  func showMinimalCamera(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard let presenter = Self.topViewController() else {
        reject("native_camera_presenter_missing", "No presenter available.", nil)
        return
      }

      if presenter is MinimalNativeCameraViewController {
        resolve(nil)
        return
      }

      let controller = MinimalNativeCameraViewController()
      controller.modalPresentationStyle = .fullScreen
      presenter.present(controller, animated: true) {
        resolve(nil)
      }
    }
  }

  private static func topViewController(
    from root: UIViewController? = {
      UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap(\.windows)
        .first(where: \.isKeyWindow)?
        .rootViewController
    }()
  ) -> UIViewController? {
    if let navigation = root as? UINavigationController {
      return topViewController(from: navigation.visibleViewController)
    }

    if let tab = root as? UITabBarController {
      return topViewController(from: tab.selectedViewController)
    }

    if let presented = root?.presentedViewController {
      return topViewController(from: presented)
    }

    return root
  }
}

final class MinimalNativeCameraViewController: UIViewController {
  private let sessionQueue = DispatchQueue(label: "com.doubleCamera.nativeCamera.controller")
  private let statusLabel = UILabel()
  private let closeButton = UIButton(type: .system)
  private let pipContainer = UIView()
  private var session: AVCaptureSession?
  private var rearPreviewLayer: AVCaptureVideoPreviewLayer?
  private var frontPreviewLayer: AVCaptureVideoPreviewLayer?
  private var isConfigured = false
  private var isRunning = false
  private var isDualCameraActive = false

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
    configureOverlay()
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    startCameraIfNeeded()
  }

  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    stopCamera()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    rearPreviewLayer?.frame = view.bounds
    frontPreviewLayer?.frame = pipContainer.bounds
    CATransaction.commit()
  }

  override var preferredStatusBarStyle: UIStatusBarStyle {
    .lightContent
  }

  private func configureOverlay() {
    closeButton.translatesAutoresizingMaskIntoConstraints = false
    closeButton.setTitle("关闭", for: .normal)
    closeButton.setTitleColor(.white, for: .normal)
    closeButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
    closeButton.backgroundColor = UIColor.black.withAlphaComponent(0.36)
    closeButton.layer.cornerRadius = 18
    closeButton.contentEdgeInsets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)
    closeButton.addTarget(self, action: #selector(handleClose), for: .touchUpInside)

    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    statusLabel.textColor = .white
    statusLabel.font = .systemFont(ofSize: 13, weight: .medium)
    statusLabel.textAlignment = .center
    statusLabel.numberOfLines = 0
    statusLabel.backgroundColor = UIColor.black.withAlphaComponent(0.28)
    statusLabel.layer.cornerRadius = 14
    statusLabel.layer.masksToBounds = true
    statusLabel.text = "原生相机启动中"

    pipContainer.translatesAutoresizingMaskIntoConstraints = false
    pipContainer.backgroundColor = UIColor.black.withAlphaComponent(0.18)
    pipContainer.layer.cornerRadius = 28
    pipContainer.layer.masksToBounds = true
    pipContainer.layer.borderWidth = 2
    pipContainer.layer.borderColor = UIColor.black.withAlphaComponent(0.32).cgColor
    pipContainer.isHidden = true

    view.addSubview(closeButton)
    view.addSubview(statusLabel)
    view.addSubview(pipContainer)

    NSLayoutConstraint.activate([
      closeButton.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
      closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
      statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      statusLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
      statusLabel.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.72),
      statusLabel.heightAnchor.constraint(greaterThanOrEqualToConstant: 34),
      pipContainer.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 92),
      pipContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),
      pipContainer.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.33),
      pipContainer.heightAnchor.constraint(equalTo: pipContainer.widthAnchor, multiplier: 1.34),
    ])
  }

  private func startCameraIfNeeded() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard !self.isRunning else { return }

      if !self.isConfigured {
        self.configureCameraSession()
      }

      guard let session = self.session, self.isConfigured else { return }
      session.startRunning()
      self.isRunning = true
      self.updateStatus(self.isDualCameraActive ? "原生双摄已就绪" : "原生相机已就绪")
    }
  }

  private func stopCamera() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isRunning || self.session?.isRunning == true else { return }
      self.session?.stopRunning()
      self.isRunning = false
    }
  }

  private func configureCameraSession() {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    if status == .notDetermined {
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard let self else { return }
        if granted {
          self.configureCameraSession()
          self.startCameraIfNeeded()
        } else {
          self.updateStatus("没有相机权限")
        }
      }
      return
    }

    guard status == .authorized else {
      updateStatus("没有相机权限")
      return
    }

    guard let rearDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
      updateStatus("后置相机不可用")
      return
    }

    if AVCaptureMultiCamSession.isMultiCamSupported {
      if configureDualCameraSession(rearDevice: rearDevice) {
        return
      }
    }

    configureSingleCameraSession(rearDevice: rearDevice)
  }

  private func configureSingleCameraSession(rearDevice: AVCaptureDevice) {
    do {
      let input = try AVCaptureDeviceInput(device: rearDevice)
      let newSession = AVCaptureSession()
      newSession.beginConfiguration()
      if newSession.canSetSessionPreset(.high) {
        newSession.sessionPreset = .high
      }

      guard newSession.canAddInput(input) else {
        newSession.commitConfiguration()
        updateStatus("相机输入加载失败")
        return
      }

      newSession.addInput(input)
      newSession.commitConfiguration()

      let layer = AVCaptureVideoPreviewLayer(session: newSession)
      layer.videoGravity = .resizeAspectFill
      if let connection = layer.connection, connection.isVideoOrientationSupported {
        connection.videoOrientation = .portrait
      }

      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        self.rearPreviewLayer?.removeFromSuperlayer()
        self.frontPreviewLayer?.removeFromSuperlayer()
        self.rearPreviewLayer = layer
        self.frontPreviewLayer = nil
        self.view.layer.insertSublayer(layer, at: 0)
        self.pipContainer.isHidden = true
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        layer.frame = self.view.bounds
        CATransaction.commit()
      }

      session = newSession
      isConfigured = true
      isDualCameraActive = false
      updateStatus("单后摄预览已就绪")
    } catch {
      updateStatus("相机启动失败: \(error.localizedDescription)")
    }
  }

  private func configureDualCameraSession(rearDevice: AVCaptureDevice) -> Bool {
    guard let frontDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front) else {
      return false
    }

    do {
      let rearInput = try AVCaptureDeviceInput(device: rearDevice)
      let frontInput = try AVCaptureDeviceInput(device: frontDevice)
      let multiCamSession = AVCaptureMultiCamSession()
      multiCamSession.beginConfiguration()
      if multiCamSession.canSetSessionPreset(.inputPriority) {
        multiCamSession.sessionPreset = .inputPriority
      }
      defer {
        multiCamSession.commitConfiguration()
      }

      guard multiCamSession.canAddInput(rearInput), multiCamSession.canAddInput(frontInput) else {
        return false
      }

      multiCamSession.addInputWithNoConnections(rearInput)
      multiCamSession.addInputWithNoConnections(frontInput)

      guard
        let rearPort = rearInput.ports(for: .video, sourceDeviceType: rearDevice.deviceType, sourceDevicePosition: .back).first,
        let frontPort = frontInput.ports(for: .video, sourceDeviceType: frontDevice.deviceType, sourceDevicePosition: .front).first
      else {
        return false
      }

      let rearLayer = AVCaptureVideoPreviewLayer(sessionWithNoConnection: multiCamSession)
      rearLayer.videoGravity = .resizeAspectFill
      let frontLayer = AVCaptureVideoPreviewLayer(sessionWithNoConnection: multiCamSession)
      frontLayer.videoGravity = .resizeAspectFill

      let rearConnection = AVCaptureConnection(inputPort: rearPort, videoPreviewLayer: rearLayer)
      let frontConnection = AVCaptureConnection(inputPort: frontPort, videoPreviewLayer: frontLayer)

      if rearConnection.isVideoOrientationSupported {
        rearConnection.videoOrientation = .portrait
      }
      if frontConnection.isVideoOrientationSupported {
        frontConnection.videoOrientation = .portrait
      }
      if frontConnection.isVideoMirroringSupported {
        if frontConnection.automaticallyAdjustsVideoMirroring {
          frontConnection.automaticallyAdjustsVideoMirroring = false
        }
        frontConnection.isVideoMirrored = true
      }

      guard multiCamSession.canAddConnection(rearConnection), multiCamSession.canAddConnection(frontConnection) else {
        return false
      }

      multiCamSession.addConnection(rearConnection)
      multiCamSession.addConnection(frontConnection)

      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        self.rearPreviewLayer?.removeFromSuperlayer()
        self.frontPreviewLayer?.removeFromSuperlayer()
        self.rearPreviewLayer = rearLayer
        self.frontPreviewLayer = frontLayer
        self.view.layer.insertSublayer(rearLayer, at: 0)
        self.pipContainer.layer.insertSublayer(frontLayer, at: 0)
        self.pipContainer.isHidden = false
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        rearLayer.frame = self.view.bounds
        frontLayer.frame = self.pipContainer.bounds
        CATransaction.commit()
      }

      session = multiCamSession
      isConfigured = true
      isDualCameraActive = true
      updateStatus("原生双摄预览已就绪")
      return true
    } catch {
      updateStatus("双摄初始化失败，回退单摄")
      return false
    }
  }

  private func updateStatus(_ text: String) {
    DispatchQueue.main.async { [weak self] in
      self?.statusLabel.text = "  \(text)  "
    }
  }

  @objc private func handleClose() {
    dismiss(animated: true)
  }
}

@objc(NativeDualCameraViewManager)
final class NativeDualCameraViewManager: RCTViewManager {
  private weak var currentView: NativeDualCameraView?
  static let ciContext = CIContext(options: [
    .useSoftwareRenderer: false,
    .priorityRequestLow: false,
  ])
  static let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    let view = NativeDualCameraView()
    currentView = view
    return view
  }

  @objc(capturePhoto:resolver:rejecter:)
  func capturePhoto(
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let view = currentView else {
      reject("native_camera_view_unavailable", "Native camera view is unavailable.", nil)
      return
    }

    view.capturePhoto(
      options: options,
      resolver: resolve,
      rejecter: reject
    )
  }

  @objc(focusPrimaryAtPoint:resolver:rejecter:)
  func focusPrimaryAtPoint(
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let view = currentView else {
      reject("native_camera_view_unavailable", "Native camera view is unavailable.", nil)
      return
    }

    view.focusPrimaryAtPoint(
      options: options,
      resolver: resolve,
      rejecter: reject
    )
  }

  @objc(startVideoRecording:resolver:rejecter:)
  func startVideoRecording(
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let view = currentView else {
      reject("native_camera_view_unavailable", "Native camera view is unavailable.", nil)
      return
    }

    view.startVideoRecording(
      options: options,
      resolver: resolve,
      rejecter: reject
    )
  }

  @objc(stopVideoRecording:rejecter:)
  func stopVideoRecording(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let view = currentView else {
      reject("native_camera_view_unavailable", "Native camera view is unavailable.", nil)
      return
    }

    view.stopVideoRecording(
      resolver: resolve,
      rejecter: reject
    )
  }
}

final class NativeDualCameraView: UIView, AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
  private struct NativeRecordedVideo {
    let side: String
    let filePath: String
  }

  private final class RecordingFinishState: @unchecked Sendable {
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

  private let sessionQueue = DispatchQueue(label: "com.doubleCamera.nativeCamera.session")
  private let videoOutputQueue = DispatchQueue(label: "com.doubleCamera.nativeCamera.videoOutput")
  private static let performanceLog = OSLog(
    subsystem: "com.skqy.doublecamera.app",
    category: "DualVideo"
  )
  private var session: AVCaptureSession?
  private var rearDeviceInput: AVCaptureDeviceInput?
  private var frontDeviceInput: AVCaptureDeviceInput?
  private let primaryContainer = UIView()
  private let secondaryContainer = UIView()
  private let splitDivider = UIView()
  private var rearPreviewLayer: AVCaptureVideoPreviewLayer?
  private var frontPreviewLayer: AVCaptureVideoPreviewLayer?
  private var rearVideoOutput: AVCaptureVideoDataOutput?
  private var frontVideoOutput: AVCaptureVideoDataOutput?
  private var audioDeviceInput: AVCaptureDeviceInput?
  private var audioDataOutput: AVCaptureAudioDataOutput?
  private var latestRearPixelBuffer: CVPixelBuffer?
  private var latestFrontPixelBuffer: CVPixelBuffer?
  private var rearAssetWriter: AVAssetWriter?
  private var frontAssetWriter: AVAssetWriter?
  private var rearAssetWriterInput: AVAssetWriterInput?
  private var frontAssetWriterInput: AVAssetWriterInput?
  private var rearAudioWriterInput: AVAssetWriterInput?
  private var frontAudioWriterInput: AVAssetWriterInput?
  private var rearPixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
  private var frontPixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
  private var combinedAssetWriter: AVAssetWriter?
  private var combinedAssetWriterInput: AVAssetWriterInput?
  private var combinedAudioWriterInput: AVAssetWriterInput?
  private var combinedPixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
  private let recordingStateLock = NSLock()
  private var _recordingStartTime: CMTime?
  private var _recordingTimelineOrigin: CMTime?
  private var _isRecording = false
  private var rearRecordingURL: URL?
  private var frontRecordingURL: URL?
  private var combinedRecordingURL: URL?
  private var recordingKeepSeparateStreams = false
  private var recordingPrimaryCamera = "rear"
  private var recordingLayout = "pip"
  private var recordingPipRect = CGRect.zero
  private var recordingPreviewSize = CGSize.zero
  private var recordingOutputSize = CGSize(width: 1080, height: 1920)
  private var recordingPipBorderVisible = true
  private var recordingStartedAt: CFAbsoluteTime?
  private var recordingSignpostID: OSSignpostID?
  private var rearWrittenFrameCount = 0
  private var frontWrittenFrameCount = 0
  private var rearDroppedFrameCount = 0
  private var frontDroppedFrameCount = 0
  private var rearFirstFrameTime: CMTime?
  private var frontFirstFrameTime: CMTime?
  private var rearLastFrameTime: CMTime?
  private var frontLastFrameTime: CMTime?
  private var combinedLastFrameTime: CMTime?
  private var combinedWrittenFrameCount = 0
  private var combinedDroppedFrameCount = 0
  private var rearWarmupFrameCount = 0
  private var frontWarmupFrameCount = 0
  private var rearTimelineCandidate: CMTime?
  private var frontTimelineCandidate: CMTime?
  private var isConfigured = false
  private var isRunning = false
  private var isStarting = false
  private var isDualCameraActive = false
  private var hasPrewarmedProcessing = false
  private var hasEmittedPreviewReady = false
  private var hasEmittedStableReady = false
  private var stableReadyWorkItem: DispatchWorkItem?

  @objc var onReady: RCTDirectEventBlock?
  @objc var onError: RCTDirectEventBlock?

  @objc var active: Bool = false {
    didSet {
      active ? startIfPossible() : stop()
    }
  }

  // Keep these exported props so the existing JS wrapper can mount safely.
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

  private var recordingStartTime: CMTime? {
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

  private var recordingTimelineOrigin: CMTime? {
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

  private var isRecording: Bool {
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

  private func configureHostView() {
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

  private func startIfPossible() {
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

  private func stop() {
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

  private func prewarmProcessingPipelineIfNeeded() {
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

    // Initialize JPEG encoding while the camera is warming up.
    let warmURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("native-dualcam-warmup-(UUID().uuidString).jpg")
    try? NativeDualCameraViewManager.ciContext.writeJPEGRepresentation(
      of: warmImage,
      to: warmURL,
      colorSpace: NativeDualCameraViewManager.colorSpace,
      options: [
        kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.5,
      ]
    )
    try? FileManager.default.removeItem(at: warmURL)
  }

  private func configure() {
    let authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)
    if authorizationStatus == .notDetermined {
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard granted else {
          self?.emitError("Camera permission is not authorized.")
          return
        }
        self?.sessionQueue.async {
          self?.isStarting = false
          self?.startIfPossible()
        }
      }
      return
    }

    guard authorizationStatus == .authorized else {
      emitError("Camera permission is not authorized.")
      return
    }

    let microphoneStatus = AVCaptureDevice.authorizationStatus(for: .audio)
    if microphoneStatus == .notDetermined {
      AVCaptureDevice.requestAccess(for: .audio) { [weak self] _ in
        self?.sessionQueue.async {
          self?.isStarting = false
          self?.startIfPossible()
        }
      }
      return
    }

    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
      emitError("Rear camera is unavailable.")
      return
    }

    audioDeviceInput = nil
    audioDataOutput = nil
    if AVCaptureMultiCamSession.isMultiCamSupported, configureDualCameraSession(rearDevice: device) {
      return
    }

    audioDeviceInput = nil
    audioDataOutput = nil
    configureSingleCameraSession(rearDevice: device)
  }

  private func configureSingleCameraSession(rearDevice: AVCaptureDevice) {
    do {
      let input = try AVCaptureDeviceInput(device: rearDevice)
      let newSession = AVCaptureSession()
      newSession.beginConfiguration()
      defer { newSession.commitConfiguration() }
      if newSession.canSetSessionPreset(.high) {
        newSession.sessionPreset = .high
      }

      guard newSession.canAddInput(input) else {
        emitError("Cannot add rear camera input.")
        return
      }

      newSession.addInput(input)

      configureAudioCaptureIfAuthorized(to: newSession)

      let output = AVCaptureVideoDataOutput()
      output.alwaysDiscardsLateVideoFrames = true
      output.videoSettings = [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)
      ]
      output.setSampleBufferDelegate(self, queue: videoOutputQueue)

      guard newSession.canAddOutput(output) else {
        emitError("Cannot add rear camera output.")
        return
      }

      newSession.addOutput(output)
      if let connection = output.connection(with: .video),
         connection.isVideoOrientationSupported {
        connection.videoOrientation = .portrait
      }

      let layer = AVCaptureVideoPreviewLayer(session: newSession)
      layer.videoGravity = .resizeAspectFill
      if let connection = layer.connection, connection.isVideoOrientationSupported {
        connection.videoOrientation = .portrait
      }

      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        self.rearPreviewLayer?.removeFromSuperlayer()
        self.frontPreviewLayer?.removeFromSuperlayer()
        self.rearPreviewLayer = layer
        self.frontPreviewLayer = nil
        self.rearDeviceInput = input
        self.frontDeviceInput = nil
        self.rearVideoOutput = output
        self.frontVideoOutput = nil
        self.latestRearPixelBuffer = nil
        self.latestFrontPixelBuffer = nil
        self.isDualCameraActive = false
        self.applyLayout()
      }

      session = newSession
      isConfigured = true
      isDualCameraActive = false
    } catch {
      emitError("Configure native camera failed: \(error.localizedDescription)")
    }
  }

  private func configureDualCameraSession(rearDevice: AVCaptureDevice) -> Bool {
    guard let frontDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front) else {
      return false
    }

    do {
      let rearInput = try AVCaptureDeviceInput(device: rearDevice)
      let frontInput = try AVCaptureDeviceInput(device: frontDevice)
      let multiCamSession = AVCaptureMultiCamSession()
      multiCamSession.beginConfiguration()
      if multiCamSession.canSetSessionPreset(.inputPriority) {
        multiCamSession.sessionPreset = .inputPriority
      }
      defer {
        multiCamSession.commitConfiguration()
      }

      guard multiCamSession.canAddInput(rearInput), multiCamSession.canAddInput(frontInput) else {
        return false
      }

      multiCamSession.addInputWithNoConnections(rearInput)
      multiCamSession.addInputWithNoConnections(frontInput)

      configureAudioCaptureIfAuthorized(to: multiCamSession)

      guard
        let rearPort = rearInput.ports(for: .video, sourceDeviceType: rearDevice.deviceType, sourceDevicePosition: .back).first,
        let frontPort = frontInput.ports(for: .video, sourceDeviceType: frontDevice.deviceType, sourceDevicePosition: .front).first
      else {
        return false
      }

      let rearLayer = AVCaptureVideoPreviewLayer(sessionWithNoConnection: multiCamSession)
      rearLayer.videoGravity = .resizeAspectFill
      let frontLayer = AVCaptureVideoPreviewLayer(sessionWithNoConnection: multiCamSession)
      frontLayer.videoGravity = .resizeAspectFill
      let rearOutput = AVCaptureVideoDataOutput()
      rearOutput.alwaysDiscardsLateVideoFrames = true
      rearOutput.videoSettings = [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)
      ]
      rearOutput.setSampleBufferDelegate(self, queue: videoOutputQueue)
      let frontOutput = AVCaptureVideoDataOutput()
      frontOutput.alwaysDiscardsLateVideoFrames = true
      frontOutput.videoSettings = [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)
      ]
      frontOutput.setSampleBufferDelegate(self, queue: videoOutputQueue)

      let rearConnection = AVCaptureConnection(inputPort: rearPort, videoPreviewLayer: rearLayer)
      let frontConnection = AVCaptureConnection(inputPort: frontPort, videoPreviewLayer: frontLayer)

      if rearConnection.isVideoOrientationSupported {
        rearConnection.videoOrientation = .portrait
      }
      if frontConnection.isVideoOrientationSupported {
        frontConnection.videoOrientation = .portrait
      }
      if frontConnection.isVideoMirroringSupported {
        if frontConnection.automaticallyAdjustsVideoMirroring {
          frontConnection.automaticallyAdjustsVideoMirroring = false
        }
        frontConnection.isVideoMirrored = true
      }

      guard multiCamSession.canAddOutput(rearOutput), multiCamSession.canAddOutput(frontOutput) else {
        return false
      }

      multiCamSession.addOutputWithNoConnections(rearOutput)
      multiCamSession.addOutputWithNoConnections(frontOutput)

      let rearOutputConnection = AVCaptureConnection(inputPorts: [rearPort], output: rearOutput)
      let frontOutputConnection = AVCaptureConnection(inputPorts: [frontPort], output: frontOutput)

      if rearOutputConnection.isVideoOrientationSupported {
        rearOutputConnection.videoOrientation = .portrait
      }
      if frontOutputConnection.isVideoOrientationSupported {
        frontOutputConnection.videoOrientation = .portrait
      }
      if frontOutputConnection.isVideoMirroringSupported {
        if frontOutputConnection.automaticallyAdjustsVideoMirroring {
          frontOutputConnection.automaticallyAdjustsVideoMirroring = false
        }
        frontOutputConnection.isVideoMirrored = true
      }

      guard
        multiCamSession.canAddConnection(rearConnection),
        multiCamSession.canAddConnection(frontConnection),
        multiCamSession.canAddConnection(rearOutputConnection),
        multiCamSession.canAddConnection(frontOutputConnection)
      else {
        return false
      }

      multiCamSession.addConnection(rearConnection)
      multiCamSession.addConnection(frontConnection)
      multiCamSession.addConnection(rearOutputConnection)
      multiCamSession.addConnection(frontOutputConnection)

      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        self.rearPreviewLayer?.removeFromSuperlayer()
        self.frontPreviewLayer?.removeFromSuperlayer()
        self.rearPreviewLayer = rearLayer
        self.frontPreviewLayer = frontLayer
        self.rearDeviceInput = rearInput
        self.frontDeviceInput = frontInput
        self.rearVideoOutput = rearOutput
        self.frontVideoOutput = frontOutput
        self.latestRearPixelBuffer = nil
        self.latestFrontPixelBuffer = nil
        self.isDualCameraActive = true
        self.applyLayout()
      }

      session = multiCamSession
      isConfigured = true
      isDualCameraActive = true
      return true
    } catch {
      emitError("Configure native dual camera failed: \(error.localizedDescription)")
      return false
    }
  }

  private func configureAudioCaptureIfAuthorized(to captureSession: AVCaptureSession) {
    guard AVCaptureDevice.authorizationStatus(for: .audio) == .authorized else { return }
    guard let microphone = AVCaptureDevice.default(for: .audio) else { return }

    do {
      let input = try AVCaptureDeviceInput(device: microphone)
      let output = AVCaptureAudioDataOutput()
      output.setSampleBufferDelegate(self, queue: videoOutputQueue)

      guard captureSession.canAddInput(input), captureSession.canAddOutput(output) else {
        NSLog("NativeDualCameraView audio capture is unavailable for this session")
        return
      }

      if let multiCamSession = captureSession as? AVCaptureMultiCamSession {
        multiCamSession.addInputWithNoConnections(input)
        multiCamSession.addOutputWithNoConnections(output)

        guard let audioPort = input.ports.first(where: { $0.mediaType == .audio }) else {
          multiCamSession.removeOutput(output)
          multiCamSession.removeInput(input)
          return
        }

        let connection = AVCaptureConnection(inputPorts: [audioPort], output: output)
        guard multiCamSession.canAddConnection(connection) else {
          multiCamSession.removeOutput(output)
          multiCamSession.removeInput(input)
          NSLog("NativeDualCameraView cannot connect microphone output")
          return
        }
        multiCamSession.addConnection(connection)
      } else {
        captureSession.addInput(input)
        captureSession.addOutput(output)
      }

      audioDeviceInput = input
      audioDataOutput = output
    } catch {
      NSLog("NativeDualCameraView microphone setup failed: %@", error.localizedDescription)
    }
  }

  private func scheduleLayoutUpdate() {
    DispatchQueue.main.async { [weak self] in
      self?.applyLayout()
    }
  }

  private func applyLayout() {
    guard Thread.isMainThread else {
      scheduleLayoutUpdate()
      return
    }

    CATransaction.begin()
    CATransaction.setDisableActions(true)

    primaryContainer.frame = bounds
    splitDivider.isHidden = true

    let showingSplit = isDualCameraActive && layoutModeString == "split"
    let showingSecondary = isDualCameraActive

    if showingSplit {
      let dividerHeight: CGFloat = 2
      let primaryHeight = max(0, floor((bounds.height - dividerHeight) / 2))
      primaryContainer.frame = CGRect(x: 0, y: 0, width: bounds.width, height: primaryHeight)
      splitDivider.frame = CGRect(x: 0, y: primaryHeight, width: bounds.width, height: dividerHeight)
      secondaryContainer.frame = CGRect(
        x: 0,
        y: primaryHeight + dividerHeight,
        width: bounds.width,
        height: max(0, bounds.height - primaryHeight - dividerHeight)
      )
      splitDivider.isHidden = false
      secondaryContainer.isHidden = false
      secondaryContainer.layer.cornerRadius = 0
      secondaryContainer.layer.borderWidth = 0
    } else if showingSecondary {
      let width = max(1, CGFloat(truncating: pipWidth))
      let height = max(1, CGFloat(truncating: pipHeight))
      let maxX = max(0, bounds.width - width)
      let maxY = max(0, bounds.height - height)
      let x = min(max(0, CGFloat(truncating: pipX)), maxX)
      let y = min(max(0, CGFloat(truncating: pipY)), maxY)
      secondaryContainer.frame = CGRect(x: x, y: y, width: width, height: height)
      secondaryContainer.isHidden = false
      secondaryContainer.layer.cornerRadius = 28
      secondaryContainer.layer.borderWidth = pipBorderVisible ? 2 : 0
      secondaryContainer.layer.borderColor = UIColor.black.withAlphaComponent(0.32).cgColor
    } else {
      secondaryContainer.isHidden = true
      secondaryContainer.layer.borderWidth = 0
      secondaryContainer.layer.cornerRadius = 0
    }

    attachPreviewLayers()
    CATransaction.commit()
  }

  private func attachPreviewLayers() {
    let primaryIsRear = primaryCameraString != "front"
    let primaryLayer = primaryIsRear ? rearPreviewLayer : frontPreviewLayer
    let secondaryLayer = primaryIsRear ? frontPreviewLayer : rearPreviewLayer

    if let primaryLayer {
      if primaryLayer.superlayer !== primaryContainer.layer {
        primaryLayer.removeFromSuperlayer()
        primaryContainer.layer.insertSublayer(primaryLayer, at: 0)
      }
      primaryLayer.frame = primaryContainer.bounds
    }

    guard isDualCameraActive, let secondaryLayer else {
      rearPreviewLayer?.frame = primaryContainer.bounds
      frontPreviewLayer?.removeFromSuperlayer()
      return
    }

    if secondaryLayer.superlayer !== secondaryContainer.layer {
      secondaryLayer.removeFromSuperlayer()
      secondaryContainer.layer.insertSublayer(secondaryLayer, at: 0)
    }
    secondaryLayer.frame = secondaryContainer.bounds
  }

  private var layoutModeString: String {
    layoutMode.lowercased.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private var primaryCameraString: String {
    primaryCamera.lowercased.trimmingCharacters(in: .whitespacesAndNewlines)
  }

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

  func capturePhoto(
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isConfigured, self.isRunning else {
        reject("native_camera_not_ready", "Native camera is not ready.", nil)
        return
      }

      let rearBuffer = self.latestRearPixelBuffer
      let frontBuffer = self.latestFrontPixelBuffer

      guard let rearBuffer else {
        reject("native_camera_rear_frame_missing", "Rear camera frame is unavailable.", nil)
        return
      }

      if self.isDualCameraActive && frontBuffer == nil {
        reject("native_camera_front_frame_missing", "Front camera frame is unavailable.", nil)
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
          "combinedUri": result.absoluteString,
        ])
      } catch {
        reject("native_camera_capture_failed", error.localizedDescription, error)
      }
    }
  }

  func focusPrimaryAtPoint(
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let x = CGFloat(truncating: options["x"] as? NSNumber ?? 0)
    let y = CGFloat(truncating: options["y"] as? NSNumber ?? 0)

    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isConfigured, self.isRunning else {
        reject("native_camera_not_ready", "Native camera is not ready.", nil)
        return
      }

      let primaryIsFront = self.primaryCameraString == "front"
      let deviceInput = primaryIsFront ? self.frontDeviceInput : self.rearDeviceInput
      let previewLayer = primaryIsFront ? self.frontPreviewLayer : self.rearPreviewLayer

      guard let device = deviceInput?.device, let previewLayer else {
        reject("native_camera_focus_unavailable", "Primary camera focus is unavailable.", nil)
        return
      }

      var focusPoint = CGPoint.zero
      var touchInsidePrimary = false
      var primaryBounds = CGRect.zero

      DispatchQueue.main.sync {
        let containerFrame = self.primaryContainer.frame
        primaryBounds = self.primaryContainer.bounds
        let touchPoint = CGPoint(x: x, y: y)
        touchInsidePrimary = containerFrame.contains(touchPoint)
        if touchInsidePrimary {
          let localPoint = CGPoint(
            x: min(max(0, touchPoint.x - containerFrame.minX), self.primaryContainer.bounds.width),
            y: min(max(0, touchPoint.y - containerFrame.minY), self.primaryContainer.bounds.height)
          )
          focusPoint = previewLayer.captureDevicePointConverted(fromLayerPoint: localPoint)
        }
      }

      guard touchInsidePrimary else {
        reject("native_camera_focus_outside_primary", "Tap is outside the primary camera area.", nil)
        return
      }

      do {
        try device.lockForConfiguration()
        defer { device.unlockForConfiguration() }

        var appliedAnyAdjustment = false

        if device.isFocusPointOfInterestSupported {
          device.focusPointOfInterest = focusPoint
          if device.isFocusModeSupported(.continuousAutoFocus) {
            device.focusMode = .continuousAutoFocus
            appliedAnyAdjustment = true
          } else if device.isFocusModeSupported(.autoFocus) {
            device.focusMode = .autoFocus
            appliedAnyAdjustment = true
          }
        }

        if device.isExposurePointOfInterestSupported {
          device.exposurePointOfInterest = focusPoint
          if device.isExposureModeSupported(.continuousAutoExposure) {
            device.exposureMode = .continuousAutoExposure
            appliedAnyAdjustment = true
          } else if device.isExposureModeSupported(.autoExpose) {
            device.exposureMode = .autoExpose
            appliedAnyAdjustment = true
          }
        }

        if device.isSubjectAreaChangeMonitoringEnabled != true {
          device.isSubjectAreaChangeMonitoringEnabled = true
        }

        if !appliedAnyAdjustment {
          NSLog(
            "NativeDualCameraView focus skipped: no supported focus/exposure adjustments. primaryIsFront=%@ point=(%.3f, %.3f) bounds=(%.1f, %.1f)",
            primaryIsFront.description,
            focusPoint.x,
            focusPoint.y,
            primaryBounds.width,
            primaryBounds.height
          )
        }

        resolve(nil)
      } catch {
        NSLog(
          "NativeDualCameraView focus configuration failed: %@, primaryIsFront=%@ point=(%.3f, %.3f) bounds=(%.1f, %.1f)",
          error.localizedDescription,
          primaryIsFront.description,
          focusPoint.x,
          focusPoint.y,
          primaryBounds.width,
          primaryBounds.height
        )
        resolve(nil)
      }
    }
  }

  func startVideoRecording(
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isConfigured, self.isRunning else {
        reject("native_camera_not_ready", "Native camera is not ready.", nil)
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
          name: "Record",
          signpostID: signpostID,
          "resolution=%{public}@ fps=%ld audio=%{public}@",
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
      let rearEndTime = self.rearLastFrameTime.map {
        min(CMTimeAdd($0, frameDuration), wallClockEndTime)
      } ?? wallClockEndTime
      let frontEndTime = self.frontLastFrameTime.map {
        min(CMTimeAdd($0, frameDuration), wallClockEndTime)
      } ?? wallClockEndTime
      let combinedEndTime = self.combinedLastFrameTime.map {
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
      let finishState = RecordingFinishState()

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
          finishState.record(writer.error ?? self.composerError("Video writer failed."))
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
        finishError = self.composerError("Realtime video did not produce any frames.")
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

      let rearBytes = rearPath.flatMap { path -> Int64? in
        guard let value = try? FileManager.default.attributesOfItem(atPath: path)[.size] as? NSNumber else {
          return nil
        }
        return value.int64Value
      } ?? 0
      let frontBytes = frontPath.flatMap { path -> Int64? in
        guard let value = try? FileManager.default.attributesOfItem(atPath: path)[.size] as? NSNumber else {
          return nil
        }
        return value.int64Value
      } ?? 0
      NSLog(
        "DualVideo recording duration=%.2fs combinedFrames=%ld combinedDropped=%ld rearFrames=%ld frontFrames=%ld rearDropped=%ld frontDropped=%ld startDelta=%.1fms endDelta=%.1fms rear=%.1fMB front=%.1fMB",
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

  private func composePhoto(
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
    let previewWidth = CGFloat(truncating: options["previewWidth"] as? NSNumber ?? NSNumber(value: Double(max(bounds.width, 1))))
    let previewHeight = CGFloat(truncating: options["previewHeight"] as? NSNumber ?? NSNumber(value: Double(max(bounds.height, 1))))
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
      throw composerError("Invalid output size.")
    }

    let outputRect = CGRect(origin: .zero, size: outputSize)
    let composedImage: CIImage

    if layout == "split", isDualCameraActive {
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
        kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: compressionQuality,
      ]
    )
    return outputURL
  }

  private func normalizedImage(from pixelBuffer: CVPixelBuffer, mirrored: Bool) -> CIImage {
    let rawImage = CIImage(cvPixelBuffer: pixelBuffer)
    var image = rawImage

    // VideoDataOutput 在不同连接配置下，拿到的像素缓冲区可能已经是竖向，
    // 不要无条件再转 90 度；只有原始帧明显还是横向时才补一次旋转。
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

  private func recordingOutputSize(for resolution: String) -> CGSize {
    switch resolution.lowercased() {
    case "720p":
      return CGSize(width: 720, height: 1280)
    default:
      return CGSize(width: 1080, height: 1920)
    }
  }

  private func recordingOutputSize(baseSize: CGSize, aspectRatio: CGFloat) -> CGSize {
    guard aspectRatio > 0 else { return baseSize }
    let longSide = max(baseSize.width, baseSize.height)
    let size = aspectRatio >= 1
      ? CGSize(width: longSide, height: longSide / aspectRatio)
      : CGSize(width: longSide * aspectRatio, height: longSide)
    return CGSize(
      width: max(2, floor(size.width / 2) * 2),
      height: max(2, floor(size.height / 2) * 2)
    )
  }

  private func prepareVideoWriters(
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
    combinedAudioWriterInput = audioEnabled
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

    let rearBundle = try makeWriterBundle(url: rearURL, outputSize: rawOutputSize, frameRate: frameRate)
    rearAssetWriter = rearBundle.writer
    rearAssetWriterInput = rearBundle.input
    rearPixelBufferAdaptor = rearBundle.adaptor
    rearAudioWriterInput = audioEnabled
      ? makeAudioWriterInput(
        writer: rearBundle.writer,
        channels: audioChannels,
        sampleRate: audioSampleRate
      )
      : nil
    rearRecordingURL = rearURL

    if isDualCameraActive {
      let frontBundle = try makeWriterBundle(url: frontURL, outputSize: rawOutputSize, frameRate: frameRate)
      frontAssetWriter = frontBundle.writer
      frontAssetWriterInput = frontBundle.input
      frontPixelBufferAdaptor = frontBundle.adaptor
      frontAudioWriterInput = audioEnabled
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

  private func makeWriterBundle(
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
      throw composerError("Cannot add writer input.")
    }
    writer.add(input)

    return (writer, input, adaptor)
  }

  private func makeAudioWriterInput(
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

  private func ensureAudioCaptureConfigured() throws {
    guard AVCaptureDevice.authorizationStatus(for: .audio) == .authorized else {
      throw composerError("Microphone permission is not authorized.")
    }
    guard audioDataOutput != nil, audioDeviceInput != nil else {
      throw composerError("Microphone capture is not ready.")
    }
  }

  private func appendVideoBuffer(
    sampleBuffer: CMSampleBuffer,
    side: String,
    presentationTime: CMTime
  ) {
    guard isRecording else { return }
    guard CMSampleBufferDataIsReady(sampleBuffer) else { return }

    guard let timelineOrigin = resolveRecordingTimelineOrigin(
      for: side,
      sampleBuffer: sampleBuffer,
      presentationTime: presentationTime
    ) else {
      recordDroppedFrame(side: side)
      return
    }

    let relativeTime = CMTimeSubtract(presentationTime, timelineOrigin)
    guard relativeTime.isValid, relativeTime >= .zero else {
      return
    }

    // Camera timestamps must stay inside the real recording window. This also
    // prevents a timestamp discontinuity from making a 5-second clip longer.
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

  private func appendRawVideoBuffer(
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

    guard let retimedSampleBuffer = makeRetimedSampleBuffer(
      from: sampleBuffer,
      presentationTime: presentationTime
    ) else {
      recordDroppedFrame(side: side)
      NSLog(
        "NativeDualCameraView retime sample buffer failed. side=%@ relative=%.3f",
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
        "NativeDualCameraView append sample buffer failed. side=%@ status=%ld error=%@ relative=%.3f",
        side,
        writer.status.rawValue,
        writer.error?.localizedDescription ?? "nil",
        CMTimeGetSeconds(presentationTime)
      )
    }
  }

  private func appendCombinedVideoFrame(presentationTime: CMTime) {
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
    guard CVPixelBufferPoolCreatePixelBuffer(
      kCFAllocatorDefault,
      pool,
      &outputBuffer
    ) == kCVReturnSuccess, let outputBuffer else {
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
        "NativeDualCameraView append combined frame failed status=%ld error=%@ time=%.3f",
        writer.status.rawValue,
        writer.error?.localizedDescription ?? "nil",
        CMTimeGetSeconds(presentationTime)
      )
    }
  }

  private func makeRealtimeComposedImage(
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

  private func appendAudioSampleBuffer(_ sampleBuffer: CMSampleBuffer) {
    guard isRecording else { return }
    guard CMSampleBufferDataIsReady(sampleBuffer) else { return }

    let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    guard let timelineOrigin = recordingTimelineOrigin else {
      return
    }

    let relativeTime = CMTimeSubtract(presentationTime, timelineOrigin)
    guard relativeTime.isValid, relativeTime >= .zero else { return }
    guard let retimedSampleBuffer = makeRetimedSampleBuffer(
      from: sampleBuffer,
      presentationTime: relativeTime
    ) else {
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

  private func appendAudioSampleBuffer(
    _ sampleBuffer: CMSampleBuffer,
    to writer: AVAssetWriter?,
    input: AVAssetWriterInput?
  ) {
    guard let writer, let input else { return }

    if writer.status == .unknown {
      guard writer.startWriting() else {
        NSLog(
          "NativeDualCameraView start audio writer failed status=%ld error=%@",
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
        "NativeDualCameraView append audio failed status=%ld error=%@ time=%.3f",
        writer.status.rawValue,
        writer.error?.localizedDescription ?? "nil",
        CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
      )
    }
  }

  private func makeRetimedSampleBuffer(
    from sampleBuffer: CMSampleBuffer,
    presentationTime: CMTime
  ) -> CMSampleBuffer? {
    let sampleCount = CMSampleBufferGetNumSamples(sampleBuffer)
    guard sampleCount > 0 else { return nil }

    var timingInfo = [CMSampleTimingInfo](
      repeating: CMSampleTimingInfo(duration: .invalid, presentationTimeStamp: .invalid, decodeTimeStamp: .invalid),
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

  private func resetRecordingState() {
    if let signpostID = recordingSignpostID {
      os_signpost(.end, log: Self.performanceLog, name: "Record", signpostID: signpostID)
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

  private func resetRecordingMetrics() {
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

  private func resolveRecordingTimelineOrigin(
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
      origin = CMTimeCompare(rearTimelineCandidate, frontTimelineCandidate) >= 0
        ? rearTimelineCandidate
        : frontTimelineCandidate
    } else {
      guard let rearTimelineCandidate else { return nil }
      origin = rearTimelineCandidate
    }

    recordingTimelineOrigin = origin
    return origin
  }

  private func isUsableOpeningFrame(_ sampleBuffer: CMSampleBuffer) -> Bool {
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

  private func recordWrittenFrame(side: String, presentationTime: CMTime) {
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

  private func recordDroppedFrame(side: String) {
    if side == "rear" {
      rearDroppedFrameCount += 1
    } else {
      frontDroppedFrameCount += 1
    }
  }

  private func frameDeltaMilliseconds(_ first: CMTime?, _ second: CMTime?) -> Double {
    guard let first, let second, first.isValid, second.isValid else { return -1 }
    return abs(CMTimeGetSeconds(CMTimeSubtract(first, second))) * 1_000
  }

  private func cancelRecordingAndDeleteTemporaryFiles() {
    let wasRecording = isRecording || rearAssetWriter != nil || frontAssetWriter != nil || combinedAssetWriter != nil
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
      NSLog("DualVideo recording cancelled and temporary files removed")
    }
  }

  private func scheduleStableReadyIfNeeded() {
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

  private func emitPreviewReadyIfNeeded() {
    guard !hasEmittedPreviewReady else { return }
    guard latestRearPixelBuffer != nil else { return }
    if isDualCameraActive, latestFrontPixelBuffer == nil { return }
    hasEmittedPreviewReady = true
    emitReady(stable: false)
  }

  private func outputSize(
    for primarySize: CGSize,
    aspectRatio: CGFloat,
    maxLongSide: CGFloat
  ) -> CGSize {
    guard primarySize.width > 0, primarySize.height > 0 else {
      return .zero
    }

    let sourceLongSide = max(primarySize.width, primarySize.height)
    // The native dual-camera frame is the live preview frame and can be smaller
    // than the requested still-photo export size. Keep the selected output
    // size instead of silently falling back to the preview dimensions.
    let longSide = maxLongSide > 0 ? maxLongSide : sourceLongSide
    guard aspectRatio > 0 else {
      let scale = longSide / sourceLongSide
      return CGSize(
        width: round(primarySize.width * scale),
        height: round(primarySize.height * scale)
      )
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
    let clippedImage = aspectFill(image, in: rect)
    let radius = min(rect.width, rect.height) * 0.12
    let roundedMask = roundedRectMask(for: rect, radius: radius)
    let pipLayer = clippedImage.applyingFilter(
      "CIBlendWithAlphaMask",
      parameters: [
        kCIInputMaskImageKey: roundedMask,
      ]
    )
    guard pipBorderVisible else {
      return pipLayer.composited(over: background)
    }

    let borderImage = borderOverlay(for: rect, radius: radius, lineWidth: 2)
    return borderImage.composited(over: pipLayer).composited(over: background)
  }

  private func roundedRectMask(for rect: CGRect, radius: CGFloat) -> CIImage {
    let filter = CIFilter(name: "CIRoundedRectangleGenerator")!
    filter.setValue(CIVector(cgRect: rect), forKey: "inputExtent")
    filter.setValue(radius, forKey: "inputRadius")
    filter.setValue(CIColor(red: 1, green: 1, blue: 1, alpha: 1), forKey: "inputColor")
    return filter.outputImage!.cropped(to: rect)
  }

  private func borderOverlay(for rect: CGRect, radius: CGFloat, lineWidth: CGFloat) -> CIImage {
    let outer = roundedRectMask(for: rect, radius: radius)
    let innerRect = rect.insetBy(dx: lineWidth, dy: lineWidth)
    let inner = roundedRectMask(for: innerRect, radius: max(0, radius - lineWidth))
      .applyingFilter("CIColorInvert")
      .cropped(to: rect)

    let ring = inner.composited(over: outer)
    return ring.applyingFilter(
      "CIColorMatrix",
      parameters: [
        "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputAVector": CIVector(x: 0, y: 0, z: 0.32, w: 0),
      ]
    )
  }

  private func composerError(_ message: String) -> NSError {
    NSError(
      domain: "NativeDualCameraView",
      code: -1,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }

  private func emitReady(stable: Bool) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.onReady?([
        "rearFrameReady": true,
        "frontFrameReady": self.isDualCameraActive,
        "stableReady": stable,
      ])
    }
  }

  private func emitError(_ message: String) {
    NSLog("NativeDualCameraView minimal preview: \(message)")
    DispatchQueue.main.async { [weak self] in
      self?.onError?(["message": message])
    }
  }
}
