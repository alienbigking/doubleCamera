// 原生相机测试模块：提供独立测试入口和最小化相机预览控制器，不参与正式拍摄页面流程。
import AVFoundation
import React
import UIKit

@objc(NativeCameraTestModule)
final class NativeCameraTestModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(showMinimalCamera:rejecter:)
  /// 展示独立的原生相机测试页面，便于排查会话和预览问题。
  func showMinimalCamera(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard let presenter = Self.topViewController() else {
        reject("native_camera_presenter_missing", "找不到可展示相机页面的控制器。", nil)
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

  /// 从当前控制器层级中查找最上层可展示页面的控制器。
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

  /// 建立测试页界面元素和画中画容器。
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
      closeButton.leadingAnchor.constraint(
        equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
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

  /// 在页面可见时异步启动测试相机会话。
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

  /// 页面离开时停止测试相机会话。
  private func stopCamera() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.isRunning || self.session?.isRunning == true else { return }
      self.session?.stopRunning()
      self.isRunning = false
    }
  }

  /// 检查权限并选择双摄或单摄方式配置测试会话。
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

    guard
      let rearDevice = AVCaptureDevice.default(
        .builtInWideAngleCamera, for: .video, position: .back)
    else {
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

  /// 配置后摄测试会话，作为双摄测试不可用时的回退。
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

  /// 配置前后摄测试输入、输出和预览连接。
  private func configureDualCameraSession(rearDevice: AVCaptureDevice) -> Bool {
    guard
      let frontDevice = AVCaptureDevice.default(
        .builtInWideAngleCamera, for: .video, position: .front)
    else {
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
        let rearPort = rearInput.ports(
          for: .video, sourceDeviceType: rearDevice.deviceType, sourceDevicePosition: .back
        ).first,
        let frontPort = frontInput.ports(
          for: .video, sourceDeviceType: frontDevice.deviceType, sourceDevicePosition: .front
        ).first
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

      guard multiCamSession.canAddConnection(rearConnection),
        multiCamSession.canAddConnection(frontConnection)
      else {
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
