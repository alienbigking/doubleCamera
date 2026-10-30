// 相机会话配置：申请摄像头权限，并建立单摄或前后双摄采集连接。
import AVFoundation
import Foundation

extension NativeDualCameraView {
  /// 根据权限和设备能力选择并配置单摄或双摄会话。
  func configure() {
    let authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)
    if authorizationStatus == .notDetermined {
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard granted else {
          self?.emitError("没有获得相机权限。")
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
      emitError("没有获得相机权限。")
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

    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
    else {
      emitError("后置相机不可用。")
      return
    }

    audioDeviceInput = nil
    audioDataOutput = nil
    if AVCaptureMultiCamSession.isMultiCamSupported, configureDualCameraSession(rearDevice: device)
    {
      return
    }

    audioDeviceInput = nil
    audioDataOutput = nil
    configureSingleCameraSession(rearDevice: device)
  }

  /// 配置后摄单摄会话，作为设备不支持多摄时的回退方案。
  func configureSingleCameraSession(rearDevice: AVCaptureDevice) {
    do {
      let input = try AVCaptureDeviceInput(device: rearDevice)
      let newSession = AVCaptureSession()
      newSession.beginConfiguration()
      defer { newSession.commitConfiguration() }
      if newSession.canSetSessionPreset(.high) {
        newSession.sessionPreset = .high
      }

      guard newSession.canAddInput(input) else {
        emitError("无法添加后置相机输入。")
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
        emitError("无法添加后置相机输出。")
        return
      }

      newSession.addOutput(output)
      if let connection = output.connection(with: .video),
        connection.isVideoOrientationSupported
      {
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
      emitError("配置原生相机失败：\(error.localizedDescription)")
    }
  }

  /// 建立前后摄输入、预览层和视频数据输出连接。
  func configureDualCameraSession(rearDevice: AVCaptureDevice) -> Bool {
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

      configureAudioCaptureIfAuthorized(to: multiCamSession)

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

      guard multiCamSession.canAddOutput(rearOutput), multiCamSession.canAddOutput(frontOutput)
      else {
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
      emitError("配置原生双摄失败：\(error.localizedDescription)")
      return false
    }
  }

  /// 在系统授权后添加麦克风输入和音频采样输出。
  func configureAudioCaptureIfAuthorized(to captureSession: AVCaptureSession) {
    guard AVCaptureDevice.authorizationStatus(for: .audio) == .authorized else { return }
    guard let microphone = AVCaptureDevice.default(for: .audio) else { return }

    do {
      let input = try AVCaptureDeviceInput(device: microphone)
      let output = AVCaptureAudioDataOutput()
      output.setSampleBufferDelegate(self, queue: videoOutputQueue)

      guard captureSession.canAddInput(input), captureSession.canAddOutput(output) else {
        NSLog("原生双摄音频：当前会话无法添加麦克风输入或输出")
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
          NSLog("原生双摄音频：无法连接麦克风输出")
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
      NSLog("原生双摄音频：麦克风配置失败，错误=%@", error.localizedDescription)
    }
  }
}
