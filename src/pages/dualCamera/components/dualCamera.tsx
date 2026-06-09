import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type LayoutRectangle,
  View,
} from 'react-native'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'
import {
  iosRequestAddOnlyGalleryPermission,
  iosRequestReadWriteGalleryPermission,
} from '@react-native-camera-roll/camera-roll'
import RNFS from 'react-native-fs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  CommonResolutions,
  VisionCamera,
  type CameraDevice,
  type CameraController,
  type CameraPhotoOutput,
  type CameraPreviewOutput,
  type CameraSession,
  type CameraVideoOutput,
  type Recorder,
  type Size,
} from 'react-native-vision-camera'
import {
  BottomCameraToolbar,
  clampNumber,
  ControlStatusToast,
  defaultProfessionalShutterDuration,
  ExposureControlPanel,
  type ExposureRange,
  type FlashMode,
  getSupportedShutterPresets,
  LensPickerPanel,
  MoreMenuPanel,
  ProfessionalQuickAdjustPanel,
  ProfessionalStatusStrip,
  QuickSettingsPanel,
  SaveFeedbackToast,
  TopMenuAiEnhancePanel,
  TopMenuCaptureAnalyticsPanel,
  TopMenuDisplayPanel,
  TopMenuFilterPanel,
  TopMenuProfessionalPanel,
  TopMenuSettingsPanel,
  TopCameraToolbar,
  WhiteBalanceControlPanel,
  whiteBalanceOptions,
  type CaptureMode,
  type CaptureTimerMode,
  type DualVideoComposeMode,
  type LensOption,
  type LayoutMode,
  type Panel,
  type PhotoSaveMode,
  type SaveFeedback,
  type StabilizationMode,
  type VideoResolutionMode,
  type VideoSaveMode,
  type WhiteBalancePreset,
} from './cameraControls'
import { GalleryModal, type GalleryAsset } from './overlays'
import { CameraPane, CameraPreviewSurface } from './cameraPreview'
import { composeDualPhoto } from './photoComposer'
import { composeDualVideo } from './videoComposer'
import {
  applyFilterToPhoto,
  type DualCameraFilterId,
  type DualCameraFilterRenderQuality,
} from './filters'
import {
  RealtimeFilteredPreviewSurface,
  useRealtimeFilteredFrameOutputs,
} from './realtimeFilteredPreview'
import {
  getGalleryAssetIndex,
  markGalleryAssets,
  type GalleryAssetKind,
} from './galleryAssetIndex'
import { useVolumeButtonShutter } from './useVolumeButtonShutter'
import {
  getCaptureAnalyticsStats,
  resetCaptureAnalyticsStats,
  trackCaptureAnalyticsAction,
  trackCaptureFailure,
  trackPhotoSaved,
  trackSavePermissionDenied,
  trackVideoSaved,
  type CaptureAnalyticsAction,
  type CaptureAnalyticsStats,
} from './captureAnalytics'

type CameraSide = 'rear' | 'front'
type PreviewStatus = 'loading' | 'ready' | 'denied' | 'unavailable' | 'error'

type PreviewOutputs = Partial<Record<CameraSide, CameraPreviewOutput>>
type PhotoOutputs = Partial<Record<CameraSide, CameraPhotoOutput>>
type VideoOutputs = Partial<Record<CameraSide, CameraVideoOutput>>
type FrameOutputs = Partial<
  Record<CameraSide, ReturnType<typeof VisionCamera.createFrameOutput>>
>
type Recorders = Partial<Record<CameraSide, Recorder>>
type CameraPair = Record<CameraSide, CameraDevice>
type Point = { x: number; y: number }
type CapturedPhotoFiles = Record<CameraSide, string> & { capturedAt: string }
type RecordedVideo = { side: CameraSide; filePath: string }
type RecordedVideoFile = RecordedVideo & { uri: string; size: number }
type SavedCameraRollAsset = Awaited<ReturnType<typeof CameraRoll.saveAsset>>

const defaultLensOptions: LensOption[] = [
  {
    id: 'wide',
    label: '主摄(1x)',
    shortLabel: '主摄',
    zoomLabel: '1x',
    zoomValue: 1,
  },
]
const ratios = ['全屏', '1:1', '4:3', '5:4', '9:16', '16:9']
const pipSize = { width: 142, height: 184 }
const pipCornerRadius = 32
const pipViewportPadding = 12
const albumName = 'DualCam'
const stabilizationPriority: StabilizationMode[] = ['standard', 'cinematic']
const captureTimerModes: CaptureTimerMode[] = ['off', '3s', '10s']
const videoResolutionConfig: Record<
  VideoResolutionMode,
  { label: string; resolution: Size; fps: number }
> = {
  '720p': {
    label: '720p 30fps',
    resolution: CommonResolutions.HD_16_9,
    fps: 30,
  },
  '1080p': {
    label: '1080p 30fps',
    resolution: CommonResolutions.FHD_16_9,
    fps: 30,
  },
  '4k': {
    label: '4K 30fps',
    resolution: CommonResolutions.UHD_16_9,
    fps: 30,
  },
}
const defaultProfessionalISO = 120
const defaultProfessionalFocusPosition = 0.5
const defaultExposureRange: ExposureRange = {
  min: -1,
  max: 1,
  supported: false,
}
const createEmptyCaptureAnalyticsStats = (): CaptureAnalyticsStats => {
  const now = new Date().toISOString()

  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    photoCount: 0,
    dualPhotoCount: 0,
    separatePhotoCount: 0,
    combinedAndSeparatePhotoCount: 0,
    videoCount: 0,
    failedPhotoCount: 0,
    failedVideoCount: 0,
    savePermissionDeniedCount: 0,
    totalPhotoSaveDurationMs: 0,
    totalVideoSaveDurationMs: 0,
    filterUsage: {},
    photoSaveModeUsage: {
      combined: 0,
      separate: 0,
      combinedAndSeparate: 0,
    },
    videoResolutionUsage: {
      '720p': 0,
      '1080p': 0,
      '4k': 0,
    },
    videoSaveModeUsage: {
      combined: 0,
      separate: 0,
      combinedAndSeparate: 0,
    },
    dualVideoComposeModeUsage: {
      pip: 0,
      split: 0,
    },
    flashUsage: {
      off: 0,
      auto: 0,
      on: 0,
    },
    stabilizationUsage: {
      off: 0,
      standard: 0,
      cinematic: 0,
    },
    timerUsage: {},
    aiEnhancementUsage: {},
    professionalModeUsage: {},
    realtimeFilteredPhotoCount: 0,
  }
}

const getCameraStatusText = (status: PreviewStatus, errorText?: string) => {
  if (status === 'loading') return '正在初始化双摄会话'
  if (status === 'denied') return '需要开启相机权限'
  if (status === 'unavailable') return '当前设备不支持前后摄同时预览'
  if (status === 'error') return errorText || '双摄会话启动失败'
  return undefined
}

const findFrontBackCombination = (combinations: CameraDevice[][]) => {
  for (const combination of combinations) {
    const front = combination.find(device => device.position === 'front')
    const rear = combination.find(device => device.position === 'back')
    if (front && rear) {
      return { front, rear }
    }
  }

  return undefined
}

const formatZoomLabel = (zoomValue: number) =>
  Number.isInteger(zoomValue)
    ? String(zoomValue)
    : zoomValue.toFixed(1).replace(/\.0$/, '')

const getRearLensOptions = (device: CameraDevice): LensOption[] => {
  const physicalDevices = device.physicalDevices.length
    ? device.physicalDevices
    : [device]
  const hasUltraWide = physicalDevices.some(
    physicalDevice => physicalDevice.type === 'ultra-wide-angle',
  )
  const hasWide = physicalDevices.some(
    physicalDevice => physicalDevice.type === 'wide-angle',
  )
  const hasTelephoto = physicalDevices.some(
    physicalDevice => physicalDevice.type === 'telephoto',
  )
  const switchFactors = device.zoomLensSwitchFactors
    .filter(factor => factor > 1)
    .sort((a, b) => a - b)
  const telephotoZoom = switchFactors[0] || (device.maxZoom >= 3 ? 3 : 2)
  const options: LensOption[] = []

  if (hasUltraWide || device.minZoom < 1) {
    const zoomValue = Math.max(device.minZoom, 0.5)
    const zoomLabel = formatZoomLabel(zoomValue)
    options.push({
      id: 'ultra-wide',
      label: `超广角(${zoomLabel}x)`,
      shortLabel: '超广角',
      zoomLabel: `${zoomLabel}x`,
      zoomValue,
    })
  }

  if (hasWide || options.length === 0) {
    options.push({
      id: 'wide',
      label: '主摄(1x)',
      shortLabel: '主摄',
      zoomLabel: '1x',
      zoomValue: 1,
    })
  }

  if (hasTelephoto && device.maxZoom >= telephotoZoom) {
    const zoomLabel = formatZoomLabel(telephotoZoom)
    options.push({
      id: 'telephoto',
      label: `长焦(${zoomLabel}x)`,
      shortLabel: '长焦',
      zoomLabel: `${zoomLabel}x`,
      zoomValue: telephotoZoom,
    })
  }

  return options
}

const toFileUri = (filePath: string) =>
  filePath.startsWith('file://') ? filePath : `file://${filePath}`

const isPermissionGranted = (status: string) =>
  status === 'granted' || status === 'limited'

const wait = (milliseconds: number) =>
  new Promise<void>(resolve => setTimeout(resolve, milliseconds))

const safeUnlinkFile = async (uri?: string) => {
  if (!uri) return

  try {
    const path = uri.startsWith('file://') ? uri.replace('file://', '') : uri
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path)
    }
  } catch (error) {
    console.warn('Clean temporary capture file failed', error)
  }
}

const getExistingFileInfo = async (uri: string) => {
  const path = uri.startsWith('file://') ? uri.replace('file://', '') : uri
  if (!(await RNFS.exists(path))) return null

  const stat = await RNFS.stat(path)
  return {
    path,
    uri: toFileUri(path),
    size: Number(stat.size || 0),
  }
}

const requestGallerySavePermission = async () => {
  if (Platform.OS === 'ios') {
    return isPermissionGranted(await iosRequestAddOnlyGalleryPermission())
  }

  if (Platform.OS !== 'android') return true

  if (Number(Platform.Version) >= 33) {
    return true
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  )
  return result === PermissionsAndroid.RESULTS.GRANTED
}

const requestGalleryReadPermission = async () => {
  if (Platform.OS === 'ios') {
    return isPermissionGranted(await iosRequestReadWriteGalleryPermission())
  }

  if (Platform.OS !== 'android') return true

  if (Number(Platform.Version) >= 33) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
    ])
    return (
      results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
        PermissionsAndroid.RESULTS.GRANTED ||
      results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] ===
        PermissionsAndroid.RESULTS.GRANTED
    )
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  )
  return result === PermissionsAndroid.RESULTS.GRANTED
}

const DualCamera = () => {
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<CaptureMode>('photo')
  const [layout, setLayout] = useState<LayoutMode>('pip')
  const [panel, setPanel] = useState<Panel>(null)
  const [lensOptions, setLensOptions] =
    useState<LensOption[]>(defaultLensOptions)
  const [selectedLensId, setSelectedLensId] = useState('wide')
  const [flashMode, setFlashMode] = useState<FlashMode>('off')
  const [rearHasFlash, setRearHasFlash] = useState(false)
  const [rearHasTorch, setRearHasTorch] = useState(false)
  const [stabilizationMode, setStabilizationMode] =
    useState<StabilizationMode>('off')
  const [stabilizationOptions, setStabilizationOptions] = useState<
    StabilizationMode[]
  >([])
  const [ratio, setRatio] = useState('全屏')
  const [primaryCamera, setPrimaryCamera] = useState<'rear' | 'front'>('rear')
  const [gridEnabled, setGridEnabled] = useState(true)
  const [photoHDREnabled, setPhotoHDREnabled] = useState(true)
  const [photoHDRSupported, setPhotoHDRSupported] = useState(false)
  const [lensSwitchHintEnabled, setLensSwitchHintEnabled] = useState(true)
  const [videoResolution, setVideoResolution] =
    useState<VideoResolutionMode>('1080p')
  const [dualVideoComposeMode, setDualVideoComposeMode] =
    useState<DualVideoComposeMode>('pip')
  const [videoSaveMode, setVideoSaveMode] = useState<VideoSaveMode>('combined')
  const [proVideoEnabled, setProVideoEnabled] = useState(false)
  const [volumeShutterEnabled, setVolumeShutterEnabled] = useState(true)
  const [pipBorderVisible, setPipBorderVisible] = useState(true)
  const [reduceTransparencyEnabled, setReduceTransparencyEnabled] =
    useState(false)
  const [flashIndicatorEnabled, setFlashIndicatorEnabled] = useState(true)
  const [aiSceneEnabled, setAiSceneEnabled] = useState(true)
  const [smartHDREnabled, setSmartHDREnabled] = useState(true)
  const [lowLightBoostEnabled, setLowLightBoostEnabled] = useState(false)
  const [smoothFocusEnabled, setSmoothFocusEnabled] = useState(true)
  const [distortionCorrectionEnabled, setDistortionCorrectionEnabled] =
    useState(true)
  const [captureAnalyticsEnabled, setCaptureAnalyticsEnabled] = useState(true)
  const [captureAnalyticsStats, setCaptureAnalyticsStats] =
    useState<CaptureAnalyticsStats>(() => createEmptyCaptureAnalyticsStats())
  const [showTopBar, setShowTopBar] = useState(true)
  const [showBottomBar, setShowBottomBar] = useState(true)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingBusy, setRecordingBusy] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [proMode, setProMode] = useState(false)
  const [photoSaveMode, setPhotoSaveMode] = useState<PhotoSaveMode>('combined')
  const [selectedFilterId, setSelectedFilterId] =
    useState<DualCameraFilterId>('none')
  const [filterRenderQuality, setFilterRenderQuality] =
    useState<DualCameraFilterRenderQuality>('standard')
  const [captureTimerMode, setCaptureTimerMode] =
    useState<CaptureTimerMode>('off')
  const [focusLocked, setFocusLocked] = useState(false)
  const [proISO, setProISO] = useState(defaultProfessionalISO)
  const [proShutterDuration, setProShutterDuration] = useState(
    defaultProfessionalShutterDuration,
  )
  const [proFocusPosition, setProFocusPosition] = useState(
    defaultProfessionalFocusPosition,
  )
  const [rearExposureBias, setRearExposureBias] = useState(0)
  const [frontExposureBias, setFrontExposureBias] = useState(0)
  const [rearWhiteBalancePreset, setRearWhiteBalancePreset] =
    useState<WhiteBalancePreset>('auto')
  const [frontWhiteBalancePreset, setFrontWhiteBalancePreset] =
    useState<WhiteBalancePreset>('auto')
  const [galleryAssets, setGalleryAssets] = useState<GalleryAsset[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('loading')
  const [previewError, setPreviewError] = useState<string>()
  const [previewOutputs, setPreviewOutputs] = useState<PreviewOutputs>({})
  const [videoCaptureReady, setVideoCaptureReady] = useState(false)
  const [captureBusy, setCaptureBusy] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>(null)
  const [controlStatusMessage, setControlStatusMessage] = useState<
    string | null
  >(null)
  const [pipPosition, setPipPosition] = useState<Point>(() => {
    const { width } = Dimensions.get('window')
    return {
      x: width - pipSize.width - 18,
      y: insets.top + 112,
    }
  })
  const cameraSessionRef = useRef<CameraSession | null>(null)
  const cameraPairRef = useRef<CameraPair | null>(null)
  const rearCameraControllerRef = useRef<CameraController | null>(null)
  const frontCameraControllerRef = useRef<CameraController | null>(null)
  const photoOutputsRef = useRef<PhotoOutputs>({})
  const previewOutputsRef = useRef<PreviewOutputs>({})
  const videoOutputsRef = useRef<VideoOutputs>({})
  const frameOutputsRef = useRef<FrameOutputs>({})
  const recordersRef = useRef<Recorders>({})
  const recordingFinishedRef = useRef<Promise<RecordedVideo>[]>([])
  const captureBusyRef = useRef(false)
  const captureFlashOpacity = useRef(new Animated.Value(0)).current
  const shutterScale = useRef(new Animated.Value(1)).current
  const saveFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const controlStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const pipPositionRef = useRef(pipPosition)
  const pipDragStartRef = useRef(pipPosition)
  const primaryViewportLayoutRef = useRef<LayoutRectangle | null>(null)
  const secondaryCamera: CameraSide =
    primaryCamera === 'rear' ? 'front' : 'rear'
  const isPip = layout === 'pip'
  const realtimeFilterEnabled = mode === 'photo' && selectedFilterId !== 'none'
  const {
    frameOutputs: realtimeFilterFrameOutputs,
    textures: realtimeTextures,
  } = useRealtimeFilteredFrameOutputs({
    enabled: realtimeFilterEnabled,
    filterId: selectedFilterId,
  })

  const loadCaptureAnalyticsStats = useCallback(async () => {
    try {
      setCaptureAnalyticsStats(await getCaptureAnalyticsStats())
    } catch (error) {
      console.warn('Load capture analytics failed', error)
    }
  }, [])

  const trackCaptureAnalytics = useCallback(
    async (
      tracker: () => Promise<CaptureAnalyticsStats>,
      enabled = captureAnalyticsEnabled,
    ) => {
      if (!enabled) return

      try {
        setCaptureAnalyticsStats(await tracker())
      } catch (error) {
        console.warn('Track capture analytics failed', error)
      }
    },
    [captureAnalyticsEnabled],
  )

  const trackCaptureAction = useCallback(
    (action: CaptureAnalyticsAction, value: string) => {
      trackCaptureAnalytics(() =>
        trackCaptureAnalyticsAction({ action, value }),
      )
    },
    [trackCaptureAnalytics],
  )

  const resetLocalCaptureAnalytics = useCallback(async () => {
    try {
      setCaptureAnalyticsStats(await resetCaptureAnalyticsStats())
      showControlStatusMessage('拍摄统计已清空')
    } catch (error) {
      console.warn('Reset capture analytics failed', error)
      showControlStatusMessage('清空统计失败')
    }
  }, [])

  useEffect(() => {
    pipPositionRef.current = pipPosition
  }, [pipPosition])

  useEffect(() => {
    loadCaptureAnalyticsStats()
  }, [loadCaptureAnalyticsStats])

  useEffect(
    () => () => {
      if (saveFeedbackTimerRef.current) {
        clearTimeout(saveFeedbackTimerRef.current)
      }
      if (controlStatusTimerRef.current) {
        clearTimeout(controlStatusTimerRef.current)
      }
    },
    [],
  )

  const getPipBoundsInViewport = (viewport: LayoutRectangle) => {
    const minX = viewport.x + pipViewportPadding
    const minY = viewport.y + pipViewportPadding
    const maxX =
      viewport.x + viewport.width - pipSize.width - pipViewportPadding
    const maxY =
      viewport.y + viewport.height - pipSize.height - pipViewportPadding

    return {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minY: Math.min(minY, maxY),
      maxY: Math.max(minY, maxY),
    }
  }

  const clampPipPosition = (point: Point) => {
    const viewport = primaryViewportLayoutRef.current

    if (viewport && viewport.width > 0 && viewport.height > 0) {
      const bounds = getPipBoundsInViewport(viewport)
      return {
        x: clampNumber(point.x, bounds.minX, bounds.maxX),
        y: clampNumber(point.y, bounds.minY, bounds.maxY),
      }
    }

    const { width, height } = Dimensions.get('window')
    return {
      x: clampNumber(
        point.x,
        pipViewportPadding,
        width - pipSize.width - pipViewportPadding,
      ),
      y: clampNumber(
        point.y,
        insets.top + pipViewportPadding,
        height - pipSize.height - insets.bottom - pipViewportPadding,
      ),
    }
  }

  const handlePrimaryViewportLayout = useCallback((layout: LayoutRectangle) => {
    const previousLayout = primaryViewportLayoutRef.current
    primaryViewportLayoutRef.current = layout

    if (layout.width <= 0 || layout.height <= 0) {
      return
    }

    setPipPosition(currentPosition => {
      const previousBounds =
        previousLayout && previousLayout.width > 0 && previousLayout.height > 0
          ? getPipBoundsInViewport(previousLayout)
          : null
      const nextBounds = getPipBoundsInViewport(layout)

      if (!previousBounds) {
        const nextPosition = clampPipPosition(currentPosition)
        pipPositionRef.current = nextPosition
        return nextPosition
      }

      const previousRangeX = Math.max(
        1,
        previousBounds.maxX - previousBounds.minX,
      )
      const previousRangeY = Math.max(
        1,
        previousBounds.maxY - previousBounds.minY,
      )
      const nextRangeX = Math.max(0, nextBounds.maxX - nextBounds.minX)
      const nextRangeY = Math.max(0, nextBounds.maxY - nextBounds.minY)
      const relativeX = clampNumber(
        (currentPosition.x - previousBounds.minX) / previousRangeX,
        0,
        1,
      )
      const relativeY = clampNumber(
        (currentPosition.y - previousBounds.minY) / previousRangeY,
        0,
        1,
      )
      const nextPosition = {
        x: nextBounds.minX + nextRangeX * relativeX,
        y: nextBounds.minY + nextRangeY * relativeY,
      }

      pipPositionRef.current = nextPosition
      return nextPosition
    })
  }, [])

  const getPrimaryPreviewMetrics = () => {
    const viewport = primaryViewportLayoutRef.current

    if (viewport && viewport.width > 0 && viewport.height > 0) {
      return {
        previewSize: {
          width: viewport.width,
          height: viewport.height,
        },
        localPipPosition: {
          x: pipPositionRef.current.x - viewport.x,
          y: pipPositionRef.current.y - viewport.y,
        },
      }
    }

    const { width, height } = Dimensions.get('window')
    return {
      previewSize: { width, height },
      localPipPosition: pipPositionRef.current,
    }
  }

  const pipPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        pipDragStartRef.current = pipPositionRef.current
      },
      onPanResponderMove: (_, gestureState) => {
        const current = pipDragStartRef.current
        setPipPosition(
          clampPipPosition({
            x: current.x + gestureState.dx,
            y: current.y + gestureState.dy,
          }),
        )
      },
      onPanResponderRelease: (_, gestureState) => {
        const current = pipDragStartRef.current
        const nextPosition = clampPipPosition({
          x: current.x + gestureState.dx,
          y: current.y + gestureState.dy,
        })
        pipPositionRef.current = nextPosition
        setPipPosition(nextPosition)
      },
      onPanResponderTerminate: (_, gestureState) => {
        const current = pipDragStartRef.current
        const nextPosition = clampPipPosition({
          x: current.x + gestureState.dx,
          y: current.y + gestureState.dy,
        })
        pipPositionRef.current = nextPosition
        setPipPosition(nextPosition)
      },
      onShouldBlockNativeResponder: () => true,
    }),
  ).current

  useEffect(() => {
    let cancelled = false

    const startMultiCamPreview = async () => {
      try {
        setPreviewStatus('loading')
        setPreviewError(undefined)

        const hasPermission =
          VisionCamera.cameraPermissionStatus === 'authorized' ||
          (await VisionCamera.requestCameraPermission())

        if (!hasPermission) {
          if (!cancelled) setPreviewStatus('denied')
          return
        }

        if (!VisionCamera.supportsMultiCamSessions) {
          if (!cancelled) setPreviewStatus('unavailable')
          return
        }

        const deviceFactory = await VisionCamera.createDeviceFactory()
        const cameraPair = findFrontBackCombination(
          deviceFactory.supportedMultiCamDeviceCombinations,
        )

        if (!cameraPair) {
          if (!cancelled) setPreviewStatus('unavailable')
          return
        }

        const rearPreviewOutput = VisionCamera.createPreviewOutput()
        const frontPreviewOutput = VisionCamera.createPreviewOutput()
        const rearFrameOutput = realtimeFilterFrameOutputs.rear
        const frontFrameOutput = realtimeFilterFrameOutputs.front
        const rearPhotoOutput = VisionCamera.createPhotoOutput({
          targetResolution: CommonResolutions.FHD_4_3,
          containerFormat: 'jpeg',
          quality: 0.92,
          qualityPrioritization: 'balanced',
        })
        const frontPhotoOutput = VisionCamera.createPhotoOutput({
          targetResolution: CommonResolutions.FHD_4_3,
          containerFormat: 'jpeg',
          quality: 0.92,
          qualityPrioritization: 'balanced',
        })
        const session = await VisionCamera.createCameraSession(true)
        const rearLensOptions = getRearLensOptions(cameraPair.rear)
        const initialLens =
          rearLensOptions.find(option => option.id === 'wide') ||
          rearLensOptions[0] ||
          defaultLensOptions[0]
        const rearStabilizationOptions = stabilizationPriority.filter(mode =>
          cameraPair.rear.supportsVideoStabilizationMode(mode),
        )
        const rearPhotoHDRSupported = cameraPair.rear.supportsPhotoHDR
        const frontPhotoHDRSupported = cameraPair.front.supportsPhotoHDR
        const photoHDRActive =
          photoHDREnabled && rearPhotoHDRSupported && frontPhotoHDRSupported
        const rearPhotoConstraints = photoHDRActive
          ? [{ photoHDR: true }, { resolutionBias: rearPhotoOutput }]
          : [{ resolutionBias: rearPhotoOutput }]
        const frontPhotoConstraints = photoHDRActive
          ? [{ photoHDR: true }, { resolutionBias: frontPhotoOutput }]
          : [{ resolutionBias: frontPhotoOutput }]

        const controllers = await session.configure([
          {
            input: cameraPair.rear,
            outputs: [
              { output: rearPreviewOutput, mirrorMode: 'off' },
              { output: rearFrameOutput, mirrorMode: 'off' },
              { output: rearPhotoOutput, mirrorMode: 'off' },
            ],
            constraints: rearPhotoConstraints,
            initialZoom: initialLens.zoomValue,
          },
          {
            input: cameraPair.front,
            outputs: [
              { output: frontPreviewOutput, mirrorMode: 'on' },
              { output: frontFrameOutput, mirrorMode: 'on' },
              { output: frontPhotoOutput, mirrorMode: 'on' },
            ],
            constraints: frontPhotoConstraints,
          },
        ])

        await session.start()

        if (!cancelled) {
          cameraSessionRef.current = session
          cameraPairRef.current = {
            rear: cameraPair.rear,
            front: cameraPair.front,
          }
          previewOutputsRef.current = {
            rear: rearPreviewOutput,
            front: frontPreviewOutput,
          }
          frameOutputsRef.current = {
            rear: rearFrameOutput,
            front: frontFrameOutput,
          }
          photoOutputsRef.current = {
            rear: rearPhotoOutput,
            front: frontPhotoOutput,
          }
          rearCameraControllerRef.current = controllers[0] || null
          frontCameraControllerRef.current = controllers[1] || null
          await applyAiEnhancementSettings(controllers[0] || null)
          syncProfessionalDefaultsFromController(controllers[0] || null)
          videoOutputsRef.current = {}
          setVideoCaptureReady(false)
          setLensOptions(rearLensOptions)
          setSelectedLensId(initialLens.id)
          setRearHasFlash(cameraPair.rear.hasFlash)
          setRearHasTorch(cameraPair.rear.hasTorch)
          setPhotoHDRSupported(rearPhotoHDRSupported && frontPhotoHDRSupported)
          setStabilizationOptions(rearStabilizationOptions)
          setStabilizationMode('off')
          setPreviewOutputs({
            rear: rearPreviewOutput,
            front: frontPreviewOutput,
          })
          setPreviewStatus('ready')
        }
      } catch (error) {
        console.warn('Start multi-cam preview failed', error)
        if (!cancelled) {
          setPreviewStatus('error')
          setPreviewError(
            error instanceof Error ? error.message : String(error),
          )
        }
      }
    }

    startMultiCamPreview()

    return () => {
      cancelled = true
      setPreviewOutputs({})
      setVideoCaptureReady(false)
      setRearHasFlash(false)
      setRearHasTorch(false)
      setPhotoHDRSupported(false)
      setFlashMode('off')
      setStabilizationOptions([])
      setStabilizationMode('off')
      cameraPairRef.current = null
      rearCameraControllerRef.current = null
      frontCameraControllerRef.current = null
      previewOutputsRef.current = {}
      photoOutputsRef.current = {}
      videoOutputsRef.current = {}
      frameOutputsRef.current = {}
      recordersRef.current = {}
      recordingFinishedRef.current = []

      const session = cameraSessionRef.current
      cameraSessionRef.current = null
      if (session) {
        session.stop().catch(() => undefined)
      }
    }
  }, [photoHDREnabled, realtimeFilterFrameOutputs])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      setRecordingSeconds(value => value + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [recording])
  const layoutLabel = layout === 'pip' ? '画中画' : '上下分屏'
  const primaryLabel = primaryCamera === 'rear' ? '后置主画面' : '前置主画面'
  const secondaryLabel = secondaryCamera === 'rear' ? '后置预览' : '前置预览'
  const previewStatusText = getCameraStatusText(previewStatus, previewError)
  const selectedLens =
    lensOptions.find(option => option.id === selectedLensId) ||
    lensOptions[0] ||
    defaultLensOptions[0]
  const rearController = rearCameraControllerRef.current
  const supportsProfessionalExposure =
    Platform.OS === 'ios' && !!rearController?.device.supportsExposureLocking
  const supportsProfessionalFocus =
    Platform.OS === 'ios' && !!rearController?.device.supportsFocusLocking
  const professionalShutterOptions = supportsProfessionalExposure
    ? getSupportedShutterPresets(
        rearController?.minExposureDuration ||
          defaultProfessionalShutterDuration,
        rearController?.maxExposureDuration ||
          defaultProfessionalShutterDuration,
      )
    : [defaultProfessionalShutterDuration]

  const topVisible = showTopBar || panel !== null
  const bottomVisible = showBottomBar || panel !== null

  const closeFloatingPanels = () => {
    if (panel) setPanel(null)
  }

  const loadGalleryAssets = async () => {
    setGalleryLoading(true)
    try {
      const hasPermission = await requestGalleryReadPermission()
      if (!hasPermission) {
        setGalleryAssets([])
        return
      }

      const galleryAssetIndex = await getGalleryAssetIndex()
      const result = await CameraRoll.getPhotos({
        first: 60,
        assetType: 'All',
        groupName: albumName,
        include: ['filename', 'fileSize', 'imageSize', 'playableDuration'],
      })

      setGalleryAssets(
        result.edges.map(edge => ({
          id: edge.node.id,
          uri: edge.node.image.uri,
          type: edge.node.type,
          filename: edge.node.image.filename || undefined,
          kind: galleryAssetIndex[edge.node.id],
        })),
      )
    } catch (error) {
      console.warn('Load camera roll failed', error)
      setGalleryAssets([])
    } finally {
      setGalleryLoading(false)
    }
  }

  const openGallery = () => {
    setGalleryOpen(true)
    loadGalleryAssets()
  }

  const selectLens = (option: LensOption) => {
    setSelectedLensId(option.id)
    setPanel(null)
    if (lensSwitchHintEnabled) {
      showControlStatusMessage(`焦段：${option.label}`)
    }
    rearCameraControllerRef.current?.setZoom(option.zoomValue).catch(error => {
      console.warn('Set rear camera zoom failed', error)
    })
  }

  const setRearTorchMode = (
    mode: FlashMode,
    controller = rearCameraControllerRef.current,
  ) => {
    if (!rearHasTorch || !controller) return

    controller.setTorchMode(mode === 'on' ? 'on' : 'off').catch(error => {
      console.warn('Set rear camera torch failed', error)
    })
  }

  const toggleFlashMode = () => {
    if (!rearHasFlash) return

    const nextFlashMode: FlashMode =
      flashMode === 'off' ? 'auto' : flashMode === 'auto' ? 'on' : 'off'

    setFlashMode(nextFlashMode)
    setRearTorchMode(nextFlashMode)
    trackCaptureAction('flash', nextFlashMode)
  }

  const showControlStatusMessage = (message: string) => {
    if (controlStatusTimerRef.current) {
      clearTimeout(controlStatusTimerRef.current)
      controlStatusTimerRef.current = null
    }

    setControlStatusMessage(message)
    controlStatusTimerRef.current = setTimeout(() => {
      setControlStatusMessage(null)
      controlStatusTimerRef.current = null
    }, 1000)
  }

  const applyAiEnhancementSettings = async (
    controller = rearCameraControllerRef.current,
  ) => {
    if (!controller) return

    try {
      await controller.configure({
        enableLowLightBoost: controller.device.supportsLowLightBoost
          ? lowLightBoostEnabled
          : undefined,
        enableSmoothAutoFocus: controller.device.supportsSmoothAutoFocus
          ? smoothFocusEnabled
          : undefined,
        enableDistortionCorrection: controller.device
          .supportsDistortionCorrection
          ? distortionCorrectionEnabled
          : undefined,
      })
    } catch (error) {
      console.warn('Apply AI enhancement settings failed', error)
      showControlStatusMessage('AI增强设置失败')
    }
  }

  const syncProfessionalDefaultsFromController = (
    controller: CameraController | null,
  ) => {
    if (!controller || Platform.OS !== 'ios') return

    if (controller.device.supportsExposureLocking) {
      const minISO = controller.minISO > 0 ? controller.minISO : 1
      const maxISO =
        controller.maxISO > 0
          ? controller.maxISO
          : Math.max(minISO, defaultProfessionalISO)
      const nextISO = clampNumber(
        controller.iso > 0 ? controller.iso : defaultProfessionalISO,
        minISO,
        maxISO,
      )
      const minDuration =
        controller.minExposureDuration > 0
          ? controller.minExposureDuration
          : defaultProfessionalShutterDuration
      const maxDuration =
        controller.maxExposureDuration > 0
          ? controller.maxExposureDuration
          : minDuration
      const shutterPresets = getSupportedShutterPresets(
        minDuration,
        maxDuration,
      )
      const nextDuration = clampNumber(
        controller.exposureDuration > 0
          ? controller.exposureDuration
          : shutterPresets[0] || defaultProfessionalShutterDuration,
        minDuration,
        maxDuration,
      )

      setProISO(nextISO)
      setProShutterDuration(nextDuration)
    }

    if (controller.device.supportsFocusLocking) {
      setProFocusPosition(
        clampNumber(
          controller.lensPosition > 0
            ? controller.lensPosition
            : defaultProfessionalFocusPosition,
          0,
          1,
        ),
      )
    }
  }

  const applyProfessionalExposureSettings = async (
    iso: number,
    duration: number,
    controller = rearCameraControllerRef.current,
  ) => {
    if (
      !controller ||
      Platform.OS !== 'ios' ||
      !controller.device.supportsExposureLocking
    ) {
      return false
    }

    const minISO = controller.minISO > 0 ? controller.minISO : 1
    const maxISO =
      controller.maxISO > 0 ? controller.maxISO : Math.max(minISO, iso)
    const minDuration =
      controller.minExposureDuration > 0
        ? controller.minExposureDuration
        : defaultProfessionalShutterDuration
    const maxDuration =
      controller.maxExposureDuration > 0
        ? controller.maxExposureDuration
        : Math.max(minDuration, duration)

    await controller.setExposureLocked(
      clampNumber(duration, minDuration, maxDuration),
      clampNumber(iso, minISO, maxISO),
    )

    return true
  }

  const applyProfessionalFocusSettings = async (
    position: number,
    controller = rearCameraControllerRef.current,
  ) => {
    if (
      !controller ||
      Platform.OS !== 'ios' ||
      !controller.device.supportsFocusLocking
    ) {
      return false
    }

    await controller.setFocusLocked(clampNumber(position, 0, 1))
    return true
  }

  const toggleProfessionalMode = async (enabled: boolean) => {
    const controller = rearCameraControllerRef.current
    if (!controller) return

    const supportsExposure =
      Platform.OS === 'ios' && controller.device.supportsExposureLocking
    const supportsFocus =
      Platform.OS === 'ios' && controller.device.supportsFocusLocking

    if (!supportsExposure && !supportsFocus) {
      showControlStatusMessage('当前设备不支持专业模式')
      return
    }

    try {
      if (enabled) {
        if (supportsExposure) {
          await applyProfessionalExposureSettings(
            proISO,
            proShutterDuration,
            controller,
          )
        }
        if (supportsFocus) {
          await applyProfessionalFocusSettings(proFocusPosition, controller)
        }
        setProMode(true)
        setFocusLocked(false)
        trackCaptureAction('professional', 'on')
        showControlStatusMessage('专业模式已开启')
      } else {
        await controller.resetFocus()
        setProMode(false)
        setFocusLocked(false)
        setRearWhiteBalancePreset('auto')
        trackCaptureAction('professional', 'off')
        showControlStatusMessage('专业模式已关闭')
      }
    } catch (error) {
      console.warn('Toggle professional mode failed', error)
      showControlStatusMessage('专业模式切换失败')
    }
  }

  const previewProfessionalISO = (value: number) => {
    const controller = rearCameraControllerRef.current
    if (!controller || !controller.device.supportsExposureLocking) return

    setProISO(
      clampNumber(
        Math.round(value),
        controller.minISO > 0 ? controller.minISO : 1,
        controller.maxISO > 0 ? controller.maxISO : Math.max(1, value),
      ),
    )
  }

  const commitProfessionalISO = async (value: number) => {
    previewProfessionalISO(value)
    if (!proMode) return

    try {
      await applyProfessionalExposureSettings(
        Math.round(value),
        proShutterDuration,
      )
    } catch (error) {
      console.warn('Set professional ISO failed', error)
      showControlStatusMessage('ISO 设置失败')
    }
  }

  const selectProfessionalShutter = async (value: number) => {
    setProShutterDuration(value)
    if (!proMode) return

    try {
      await applyProfessionalExposureSettings(proISO, value)
    } catch (error) {
      console.warn('Set professional shutter failed', error)
      showControlStatusMessage('快门设置失败')
    }
  }

  const previewProfessionalFocusPosition = (value: number) => {
    setProFocusPosition(clampNumber(value, 0, 1))
  }

  const commitProfessionalFocusPosition = async (value: number) => {
    previewProfessionalFocusPosition(value)
    if (!proMode) return

    try {
      await applyProfessionalFocusSettings(value)
    } catch (error) {
      console.warn('Set professional focus failed', error)
      showControlStatusMessage('手动对焦失败')
    }
  }

  const handleTopBarVisibilityChange = (value: boolean) => {
    if (!value && !showBottomBar) {
      showControlStatusMessage('至少保留一个工具栏')
      return
    }

    setShowTopBar(value)
  }

  const handleBottomBarVisibilityChange = (value: boolean) => {
    if (!value && !showTopBar) {
      showControlStatusMessage('至少保留一个工具栏')
      return
    }

    setShowBottomBar(value)
  }

  const resetCaptureSettings = () => {
    setGridEnabled(true)
    setPhotoHDREnabled(true)
    setLensSwitchHintEnabled(true)
    setVideoResolution('1080p')
    setDualVideoComposeMode('pip')
    setVideoSaveMode('combined')
    setProVideoEnabled(false)
    setVolumeShutterEnabled(true)
    setPipBorderVisible(true)
    setReduceTransparencyEnabled(false)
    setFlashIndicatorEnabled(true)
    setAiSceneEnabled(true)
    setSmartHDREnabled(true)
    setLowLightBoostEnabled(false)
    setSmoothFocusEnabled(true)
    setDistortionCorrectionEnabled(true)
    setCaptureAnalyticsEnabled(true)
    setCaptureTimerMode('off')
    setVideoCaptureReady(false)
    showControlStatusMessage('已恢复默认设置')
  }

  const toggleTimedCaptureSetting = (enabled: boolean) => {
    const nextMode = enabled ? '3s' : 'off'
    setCaptureTimerMode(nextMode)
    trackCaptureAction('timer', nextMode)
  }

  const togglePhotoHDRSetting = (enabled: boolean) => {
    if (!photoHDRSupported) {
      showControlStatusMessage('当前双摄组合不支持 HDR')
      return
    }

    setPhotoHDREnabled(enabled)
    setSmartHDREnabled(enabled)
    showControlStatusMessage(enabled ? 'HDR 已开启' : 'HDR 已关闭')
  }

  const toggleSmartHDR = (enabled: boolean) => {
    togglePhotoHDRSetting(enabled)
  }

  const toggleLowLightBoost = async (enabled: boolean) => {
    const controller = rearCameraControllerRef.current
    if (!controller?.device.supportsLowLightBoost) {
      showControlStatusMessage('当前设备不支持低光增强')
      return
    }

    setLowLightBoostEnabled(enabled)
    try {
      await controller.configure({ enableLowLightBoost: enabled })
      trackCaptureAction('aiEnhancement', `lowLight:${enabled ? 'on' : 'off'}`)
      showControlStatusMessage(enabled ? '低光增强已开启' : '低光增强已关闭')
    } catch (error) {
      console.warn('Toggle low light boost failed', error)
      showControlStatusMessage('低光增强设置失败')
    }
  }

  const toggleSmoothFocus = async (enabled: boolean) => {
    const controller = rearCameraControllerRef.current
    if (!controller?.device.supportsSmoothAutoFocus) {
      showControlStatusMessage('当前设备不支持平滑对焦')
      return
    }

    setSmoothFocusEnabled(enabled)
    try {
      await controller.configure({ enableSmoothAutoFocus: enabled })
      trackCaptureAction(
        'aiEnhancement',
        `smoothFocus:${enabled ? 'on' : 'off'}`,
      )
      showControlStatusMessage(enabled ? '平滑对焦已开启' : '平滑对焦已关闭')
    } catch (error) {
      console.warn('Toggle smooth focus failed', error)
      showControlStatusMessage('平滑对焦设置失败')
    }
  }

  const toggleDistortionCorrection = async (enabled: boolean) => {
    const controller = rearCameraControllerRef.current
    if (!controller?.device.supportsDistortionCorrection) {
      showControlStatusMessage('当前设备不支持畸变矫正')
      return
    }

    setDistortionCorrectionEnabled(enabled)
    try {
      await controller.configure({ enableDistortionCorrection: enabled })
      trackCaptureAction(
        'aiEnhancement',
        `distortion:${enabled ? 'on' : 'off'}`,
      )
      showControlStatusMessage(enabled ? '畸变矫正已开启' : '畸变矫正已关闭')
    } catch (error) {
      console.warn('Toggle distortion correction failed', error)
      showControlStatusMessage('畸变矫正设置失败')
    }
  }

  const selectVideoResolution = (value: VideoResolutionMode) => {
    setVideoResolution(value)
    setVideoCaptureReady(false)
    showControlStatusMessage(
      `${videoResolutionConfig[value].label} 下次录像生效`,
    )
  }

  const selectFilter = (filterId: DualCameraFilterId) => {
    setSelectedFilterId(filterId)
    trackCaptureAction('filter', filterId)
  }

  const toggleProVideoSetting = (enabled: boolean) => {
    setProVideoEnabled(enabled)
    setVideoCaptureReady(false)
  }

  const toggleVolumeShutterSetting = (enabled: boolean) => {
    setVolumeShutterEnabled(enabled)
    showControlStatusMessage(enabled ? '音量键快门已开启' : '音量键快门已关闭')
  }

  const togglePipBorderSetting = (enabled: boolean) => {
    setPipBorderVisible(enabled)
    showControlStatusMessage(enabled ? '小窗白边已显示' : '小窗白边已隐藏')
  }

  const toggleCaptureAnalyticsSetting = (enabled: boolean) => {
    setCaptureAnalyticsEnabled(enabled)
    showControlStatusMessage(enabled ? '拍摄统计已开启' : '拍摄统计已暂停')
  }

  const toggleStabilizationMode = () => {
    if (mode === 'photo') {
      showControlStatusMessage('防抖仅录像生效')
      return
    }

    if (stabilizationOptions.length === 0) return

    const availableModes: StabilizationMode[] = ['off', ...stabilizationOptions]
    const currentIndex = availableModes.indexOf(stabilizationMode)
    const nextMode =
      availableModes[(currentIndex + 1) % availableModes.length] || 'off'

    setStabilizationMode(nextMode)
    setVideoCaptureReady(false)
    trackCaptureAction('stabilization', nextMode)
    showControlStatusMessage(
      nextMode === 'off'
        ? '防抖已关闭'
        : nextMode === 'standard'
        ? '防抖：标准'
        : '防抖：影院',
    )
  }

  const toggleCaptureTimer = () => {
    const currentIndex = captureTimerModes.indexOf(captureTimerMode)
    const nextMode =
      captureTimerModes[(currentIndex + 1) % captureTimerModes.length] || 'off'

    setCaptureTimerMode(nextMode)
    trackCaptureAction('timer', nextMode)
  }

  const toggleFocusLock = async () => {
    if (proMode) {
      showControlStatusMessage('请先退出专业模式')
      return
    }

    const controller = rearCameraControllerRef.current
    if (!controller?.device.supportsFocusLocking) {
      showControlStatusMessage('当前设备不支持锁焦')
      return
    }

    try {
      if (focusLocked) {
        await controller.resetFocus()
        setFocusLocked(false)
        setRearWhiteBalancePreset('auto')
      } else {
        await controller.lockCurrentFocus()
        setFocusLocked(true)
      }
    } catch (error) {
      console.warn('Toggle focus lock failed', error)
      showControlStatusMessage('对焦锁定失败')
    }
  }

  const getExposureRange = (
    controller: CameraController | null,
  ): ExposureRange => {
    if (!controller?.device.supportsExposureBias) return defaultExposureRange

    return {
      min: controller.device.minExposureBias,
      max: controller.device.maxExposureBias,
      supported: true,
    }
  }

  const applyExposureBias = async (
    side: CameraSide,
    value: number,
    controller = side === 'rear'
      ? rearCameraControllerRef.current
      : frontCameraControllerRef.current,
  ) => {
    if (side === 'rear' && proMode) {
      showControlStatusMessage('专业模式下请调 ISO 和快门')
      return
    }

    if (!controller?.device.supportsExposureBias) {
      showControlStatusMessage('当前设备不支持曝光补偿')
      return
    }

    const nextBias = Math.min(
      Math.max(value, controller.device.minExposureBias),
      controller.device.maxExposureBias,
    )

    if (side === 'rear') {
      setRearExposureBias(nextBias)
    } else {
      setFrontExposureBias(nextBias)
    }

    try {
      await controller.setExposureBias(nextBias)
    } catch (error) {
      console.warn('Set exposure bias failed', error)
      showControlStatusMessage('曝光设置失败')
    }
  }

  const resetExposureBias = (side: CameraSide) => {
    applyExposureBias(side, 0)
  }

  const applyWhiteBalancePreset = async (
    side: CameraSide,
    preset: WhiteBalancePreset,
    controller = side === 'rear'
      ? rearCameraControllerRef.current
      : frontCameraControllerRef.current,
  ) => {
    if (side === 'rear' && proMode) {
      showControlStatusMessage('请先退出专业模式')
      return
    }

    if (!controller?.device.supportsWhiteBalanceLocking) {
      showControlStatusMessage('当前设备不支持白平衡锁定')
      return
    }

    try {
      if (preset === 'auto') {
        await controller.resetFocus()
        if (side === 'rear') setFocusLocked(false)
      } else {
        const option = whiteBalanceOptions.find(item => item.id === preset)
        if (!option?.temperature) return

        const gains = controller.convertWhiteBalanceTemperatureAndTintValues({
          temperature: option.temperature,
          tint: option.tint || 0,
        })
        await controller.setWhiteBalanceLocked(gains)
      }

      if (side === 'rear') {
        setRearWhiteBalancePreset(preset)
      } else {
        setFrontWhiteBalancePreset(preset)
      }
    } catch (error) {
      console.warn('Set white balance failed', error)
      showControlStatusMessage('白平衡设置失败')
    }
  }

  const runCaptureCountdown = async () => {
    if (captureTimerMode === 'off') return

    const seconds = Number(captureTimerMode.replace('s', ''))
    for (let remaining = seconds; remaining > 0; remaining -= 1) {
      showControlStatusMessage(String(remaining))
      await wait(1000)
    }
  }

  const runCaptureAnimation = () => {
    captureFlashOpacity.setValue(0)
    shutterScale.setValue(1)
    Animated.parallel([
      Animated.sequence([
        Animated.timing(captureFlashOpacity, {
          toValue: 0.62,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(captureFlashOpacity, {
          toValue: 0,
          duration: 210,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(shutterScale, {
          toValue: 0.84,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(shutterScale, {
          toValue: 1,
          damping: 10,
          stiffness: 210,
          mass: 0.55,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }

  const showSaveFeedback = (feedback: SaveFeedback) => {
    if (saveFeedbackTimerRef.current) {
      clearTimeout(saveFeedbackTimerRef.current)
      saveFeedbackTimerRef.current = null
    }

    setSaveFeedback(feedback)

    if (
      feedback === 'saved' ||
      feedback === 'fallback' ||
      feedback === 'failed'
    ) {
      saveFeedbackTimerRef.current = setTimeout(
        () => {
          setSaveFeedback(null)
          saveFeedbackTimerRef.current = null
        },
        feedback === 'saved' ? 900 : 1500,
      )
    }
  }

  const prependGalleryAssets = (
    assets: { asset: SavedCameraRollAsset; kind: GalleryAssetKind }[],
  ) => {
    setGalleryAssets(previous => [
      ...assets.map(({ asset, kind }) => ({
        id: asset.node.id,
        uri: asset.node.image.uri,
        type: asset.node.type,
        filename: asset.node.image.filename || undefined,
        kind,
      })),
      ...previous,
    ])
  }

  const markSavedGalleryAssets = async (
    assets: SavedCameraRollAsset[],
    kind: GalleryAssetKind,
  ) => {
    await markGalleryAssets(
      assets.map(asset => asset.node.id),
      kind,
    )
  }

  const saveSeparatePhotoAssets = async (photos: CapturedPhotoFiles) => {
    const { previewSize } = getPrimaryPreviewMetrics()
    const outputOptions = {
      ratio,
      previewSize,
    }
    const [rearPhotoUri, frontPhotoUri] = await Promise.all([
      applyFilterToPhoto(
        photos.rear,
        selectedFilterId,
        filterRenderQuality,
        outputOptions,
      ),
      applyFilterToPhoto(
        photos.front,
        selectedFilterId,
        filterRenderQuality,
        outputOptions,
      ),
    ])
    const [rearAsset, frontAsset] = await Promise.all([
      CameraRoll.saveAsset(rearPhotoUri, {
        type: 'photo',
        album: albumName,
      }),
      CameraRoll.saveAsset(frontPhotoUri, {
        type: 'photo',
        album: albumName,
      }),
    ])
    await Promise.all([
      safeUnlinkFile(rearPhotoUri === photos.rear ? undefined : rearPhotoUri),
      safeUnlinkFile(
        frontPhotoUri === photos.front ? undefined : frontPhotoUri,
      ),
    ])

    return [rearAsset, frontAsset]
  }

  const saveCombinedPhotoAsset = async (photos: CapturedPhotoFiles) => {
    const { previewSize, localPipPosition } = getPrimaryPreviewMetrics()
    const combinedPhotoUri = await composeDualPhoto({
      photos,
      layout,
      primaryCamera,
      pipPosition: localPipPosition,
      pipSize,
      previewSize,
      ratio,
      filterId: selectedFilterId,
      renderQuality: filterRenderQuality,
      pipBorderVisible,
    })
    return CameraRoll.saveAsset(combinedPhotoUri, {
      type: 'photo',
      album: albumName,
    }).finally(() => safeUnlinkFile(combinedPhotoUri))
  }

  const saveSeparatePhotos = async (photos: CapturedPhotoFiles) => {
    const hasSavePermission = await requestGallerySavePermission()
    if (!hasSavePermission) {
      console.warn('No permission to save photos')
      trackCaptureAnalytics(trackSavePermissionDenied)
      return false
    }

    const assets = await saveSeparatePhotoAssets(photos)
    await markSavedGalleryAssets(assets, 'singlePhoto')
    prependGalleryAssets(assets.map(asset => ({ asset, kind: 'singlePhoto' })))
    return true
  }

  const saveCombinedPhoto = async (photos: CapturedPhotoFiles) => {
    const hasSavePermission = await requestGallerySavePermission()
    if (!hasSavePermission) {
      console.warn('No permission to save combined photo')
      trackCaptureAnalytics(trackSavePermissionDenied)
      return false
    }

    const asset = await saveCombinedPhotoAsset(photos)
    await markSavedGalleryAssets([asset], 'dualPhoto')
    prependGalleryAssets([{ asset, kind: 'dualPhoto' }])
    return true
  }

  const saveCombinedAndSeparatePhotos = async (photos: CapturedPhotoFiles) => {
    const hasSavePermission = await requestGallerySavePermission()
    if (!hasSavePermission) {
      console.warn('No permission to save combined and separate photos')
      trackCaptureAnalytics(trackSavePermissionDenied)
      return false
    }

    const combinedAsset = await saveCombinedPhotoAsset(photos)
    const separateAssets = await saveSeparatePhotoAssets(photos)
    await markSavedGalleryAssets([combinedAsset], 'dualPhoto')
    await markSavedGalleryAssets(separateAssets, 'singlePhoto')
    prependGalleryAssets([
      { asset: combinedAsset, kind: 'dualPhoto' },
      ...separateAssets.map(asset => ({ asset, kind: 'singlePhoto' as const })),
    ])
    return true
  }

  const capturePhotos = async () => {
    if (captureBusyRef.current) return
    captureBusyRef.current = true

    const rearPhotoOutput = photoOutputsRef.current.rear
    const frontPhotoOutput = photoOutputsRef.current.front
    if (previewStatus !== 'ready' || !rearPhotoOutput || !frontPhotoOutput) {
      captureBusyRef.current = false
      return
    }

    let photos: CapturedPhotoFiles | null = null
    const captureStartedAt = Date.now()

    try {
      runCaptureAnimation()
      showSaveFeedback('saving')
      setCaptureBusy(true)
      const rearPhoto = await rearPhotoOutput.capturePhotoToFile(
        {
          flashMode: rearHasFlash ? flashMode : 'off',
          enableShutterSound: true,
        },
        {},
      )
      const frontPhoto = await frontPhotoOutput.capturePhotoToFile(
        {
          flashMode: 'off',
          enableShutterSound: false,
        },
        {},
      )

      photos = {
        rear: toFileUri(rearPhoto.filePath),
        front: toFileUri(frontPhoto.filePath),
        capturedAt: new Date().toLocaleString(),
      }

      let saved = false
      if (photoSaveMode === 'combined') {
        saved = await saveCombinedPhoto(photos)
      } else if (photoSaveMode === 'separate') {
        saved = await saveSeparatePhotos(photos)
      } else {
        saved = await saveCombinedAndSeparatePhotos(photos)
      }

      if (saved) {
        trackCaptureAnalytics(() =>
          trackPhotoSaved({
            saveMode: photoSaveMode,
            filterId: selectedFilterId,
            filterRenderQuality,
            durationMs: Date.now() - captureStartedAt,
          }),
        )
      }
      showSaveFeedback('saved')
    } catch (error) {
      console.warn('Dual camera capture failed', error)
      trackCaptureAnalytics(() => trackCaptureFailure('photo'))
      showSaveFeedback(null)
    } finally {
      if (photos) {
        await safeUnlinkFile(photos.rear)
        await safeUnlinkFile(photos.front)
      }
      captureBusyRef.current = false
      setCaptureBusy(false)
    }
  }

  const configureVideoSession = async () => {
    if (videoCaptureReady) return true

    const session = cameraSessionRef.current
    const cameraPair = cameraPairRef.current
    const rearPreviewOutput = previewOutputsRef.current.rear
    const frontPreviewOutput = previewOutputsRef.current.front
    const rearPhotoOutput = photoOutputsRef.current.rear
    const frontPhotoOutput = photoOutputsRef.current.front

    if (
      !session ||
      !cameraPair ||
      !rearPreviewOutput ||
      !frontPreviewOutput ||
      !rearPhotoOutput ||
      !frontPhotoOutput
    ) {
      return false
    }

    try {
      const selectedVideoConfig = videoResolutionConfig[videoResolution]
      const rearVideoOutput = VisionCamera.createVideoOutput({
        targetResolution: selectedVideoConfig.resolution,
        enableAudio: false,
        enableHigherResolutionCodecs: videoResolution === '4k',
        fileType: 'mp4',
      })
      const frontVideoOutput = VisionCamera.createVideoOutput({
        targetResolution: selectedVideoConfig.resolution,
        enableAudio: false,
        enableHigherResolutionCodecs: videoResolution === '4k',
        fileType: 'mp4',
      })
      const selectedLens =
        lensOptions.find(option => option.id === selectedLensId) ||
        defaultLensOptions[0]
      const rearConstraints = [
        { fps: selectedVideoConfig.fps },
        { resolutionBias: rearVideoOutput },
        ...(stabilizationMode !== 'off' &&
        cameraPair.rear.supportsVideoStabilizationMode(stabilizationMode)
          ? [{ videoStabilizationMode: stabilizationMode }]
          : []),
      ]
      const frontConstraints = [
        { fps: selectedVideoConfig.fps },
        { resolutionBias: frontVideoOutput },
        ...(stabilizationMode !== 'off' &&
        cameraPair.front.supportsVideoStabilizationMode(stabilizationMode)
          ? [{ videoStabilizationMode: stabilizationMode }]
          : []),
      ]

      const controllers = await session.configure([
        {
          input: cameraPair.rear,
          outputs: [
            { output: rearPreviewOutput, mirrorMode: 'off' },
            { output: rearPhotoOutput, mirrorMode: 'off' },
            { output: rearVideoOutput, mirrorMode: 'off' },
          ],
          constraints: rearConstraints,
          initialZoom: selectedLens.zoomValue,
        },
        {
          input: cameraPair.front,
          outputs: [
            { output: frontPreviewOutput, mirrorMode: 'on' },
            { output: frontPhotoOutput, mirrorMode: 'on' },
            { output: frontVideoOutput, mirrorMode: 'on' },
          ],
          constraints: frontConstraints,
        },
      ])

      videoOutputsRef.current = {
        rear: rearVideoOutput,
        front: frontVideoOutput,
      }
      rearCameraControllerRef.current = controllers[0] || null
      frontCameraControllerRef.current = controllers[1] || null
      await applyAiEnhancementSettings(controllers[0] || null)
      if (proMode && proVideoEnabled) {
        await applyProfessionalExposureSettings(
          proISO,
          proShutterDuration,
          controllers[0] || null,
        )
        await applyProfessionalFocusSettings(
          proFocusPosition,
          controllers[0] || null,
        )
      } else {
        syncProfessionalDefaultsFromController(controllers[0] || null)
      }
      setRearTorchMode(flashMode, controllers[0] || null)
      if (!proMode && rearExposureBias !== 0) {
        await applyExposureBias(
          'rear',
          rearExposureBias,
          controllers[0] || null,
        )
      }
      if (frontExposureBias !== 0) {
        await applyExposureBias(
          'front',
          frontExposureBias,
          controllers[1] || null,
        )
      }
      if (!proMode && rearWhiteBalancePreset !== 'auto') {
        await applyWhiteBalancePreset(
          'rear',
          rearWhiteBalancePreset,
          controllers[0] || null,
        )
      }
      if (frontWhiteBalancePreset !== 'auto') {
        await applyWhiteBalancePreset(
          'front',
          frontWhiteBalancePreset,
          controllers[1] || null,
        )
      }
      setVideoCaptureReady(true)
      return true
    } catch (error) {
      console.warn('Configure dual video session failed', error)
      videoOutputsRef.current = {}
      setVideoCaptureReady(false)
      if (stabilizationMode !== 'off') {
        setStabilizationMode('off')
      }
      return false
    }
  }

  const startVideoRecording = async () => {
    if (recording || recordingBusy) return

    try {
      setRecordingBusy(true)
      const configured = await configureVideoSession()
      if (!configured) {
        console.warn('Dual video recording is not available on this device')
        return
      }

      const rearVideoOutput = videoOutputsRef.current.rear
      const frontVideoOutput = videoOutputsRef.current.front
      if (previewStatus !== 'ready' || !rearVideoOutput || !frontVideoOutput) {
        console.warn('Dual video recording is not available on this session')
        return
      }

      const rearRecorder = await rearVideoOutput.createRecorder({})
      const frontRecorder = await frontVideoOutput.createRecorder({})

      const makeRecording = (side: CameraSide, recorder: Recorder) => {
        let startRecording: Promise<void>
        const finishPromise = new Promise<RecordedVideo>((resolve, reject) => {
          startRecording = recorder.startRecording(
            filePath => resolve({ side, filePath }),
            error => reject(error),
          )
        })
        return { finishPromise, startRecording: startRecording! }
      }

      const rearRecording = makeRecording('rear', rearRecorder)
      const frontRecording = makeRecording('front', frontRecorder)

      recordersRef.current = {
        rear: rearRecorder,
        front: frontRecorder,
      }
      recordingFinishedRef.current = [
        rearRecording.finishPromise,
        frontRecording.finishPromise,
      ]
      await Promise.all([
        rearRecording.startRecording,
        frontRecording.startRecording,
      ])
      setRecordingSeconds(0)
      setRecording(true)
    } catch (error) {
      console.warn('Start dual video recording failed', error)
      recordersRef.current = {}
      recordingFinishedRef.current = []
    } finally {
      setRecordingBusy(false)
    }
  }

  useEffect(() => {
    if (
      mode !== 'video' ||
      previewStatus !== 'ready' ||
      recording ||
      videoCaptureReady
    ) {
      return
    }

    let cancelled = false
    configureVideoSession().then(configured => {
      if (!cancelled && configured) {
        showControlStatusMessage('录像已就绪')
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    mode,
    previewStatus,
    videoCaptureReady,
    videoResolution,
    stabilizationMode,
    proVideoEnabled,
    proMode,
    selectedLensId,
    recording,
  ])

  const stopVideoRecording = async () => {
    if (!recording || recordingBusy) return

    const recorders = recordersRef.current
    const finishPromises = recordingFinishedRef.current
    try {
      const saveStartedAt = Date.now()
      setRecordingBusy(true)
      showSaveFeedback('saving')
      await Promise.all(
        [recorders.rear, recorders.front].map(recorder =>
          recorder?.stopRecording().catch(error => {
            console.warn('Stop recorder failed', error)
          }),
        ),
      )
      setRecording(false)
      setRecordingSeconds(0)

      const finishResults = await Promise.allSettled(finishPromises)
      const videos = finishResults
        .filter(
          (result): result is PromiseFulfilledResult<RecordedVideo> =>
            result.status === 'fulfilled',
        )
        .map(result => result.value)

      finishResults.forEach(result => {
        if (result.status === 'rejected') {
          console.warn('Video recording output failed', result.reason)
        }
      })

      const videoFiles = (
        await Promise.all(
          videos.map(async video => {
            const fileInfo = await getExistingFileInfo(video.filePath)
            if (!fileInfo || fileInfo.size <= 0) {
              console.warn('Recorded video file is missing or empty', video)
              return null
            }

            return {
              ...video,
              uri: fileInfo.uri,
              size: fileInfo.size,
            }
          }),
        )
      ).filter((video): video is RecordedVideoFile => video !== null)

      if (videoFiles.length === 0) {
        throw new Error('No valid video file was recorded.')
      }

      const hasSavePermission = await requestGallerySavePermission()
      if (!hasSavePermission) {
        console.warn('No permission to save videos')
        trackCaptureAnalytics(trackSavePermissionDenied)
        showSaveFeedback('failed')
        return
      }

      const saveVideoAsset = async (uri: string) => {
        try {
          return await CameraRoll.saveAsset(uri, {
            type: 'video',
            album: albumName,
          })
        } catch (error) {
          console.warn(
            'Save video to DualCam album failed, retrying library',
            error,
          )
          return CameraRoll.saveAsset(uri, {
            type: 'video',
          })
        }
      }
      const saveSeparateVideoAssets = () =>
        Promise.all(videoFiles.map(video => saveVideoAsset(video.uri)))
      const saveCombinedVideoAsset = async () => {
        const hasRearVideo = videoFiles.some(video => video.side === 'rear')
        const hasFrontVideo = videoFiles.some(video => video.side === 'front')
        if (!hasRearVideo || !hasFrontVideo) {
          throw new Error(
            'Combined video requires both rear and front recordings.',
          )
        }

        const { previewSize, localPipPosition } = getPrimaryPreviewMetrics()
        console.info('Saving dual video with native composer', {
          videoSaveMode,
          dualVideoComposeMode,
          primaryCamera,
          videoCount: videoFiles.length,
          previewSize,
          pipSize,
        })
        const combinedVideoUri = await composeDualVideo({
          videos: videoFiles,
          layout: dualVideoComposeMode,
          primaryCamera,
          pipPosition: localPipPosition,
          pipSize,
          previewSize,
          pipBorderVisible,
        })
        const combinedFileInfo = await getExistingFileInfo(combinedVideoUri)
        if (!combinedFileInfo || combinedFileInfo.size <= 0) {
          await safeUnlinkFile(combinedVideoUri)
          throw new Error('Combined video export did not create a valid file.')
        }

        return saveVideoAsset(combinedFileInfo.uri).finally(() =>
          safeUnlinkFile(combinedFileInfo.uri),
        )
      }

      let usedFallbackSave = false
      let assets: SavedCameraRollAsset[]
      if (videoSaveMode === 'separate') {
        assets = await saveSeparateVideoAssets()
      } else if (videoSaveMode === 'combinedAndSeparate') {
        try {
          assets = [
            await saveCombinedVideoAsset(),
            ...(await saveSeparateVideoAssets()),
          ]
        } catch (error) {
          console.warn(
            'Combined video save failed, saving separate videos',
            error,
          )
          usedFallbackSave = true
          assets = await saveSeparateVideoAssets()
        }
      } else {
        assets = [await saveCombinedVideoAsset()]
      }

      if (assets.length === 0) {
        throw new Error('No video asset was saved.')
      }

      await markSavedGalleryAssets(assets, 'video')
      prependGalleryAssets(assets.map(asset => ({ asset, kind: 'video' })))
      trackCaptureAnalytics(() =>
        trackVideoSaved({
          resolution: videoResolution,
          saveMode: videoSaveMode,
          composeMode: dualVideoComposeMode,
          stabilizationMode,
          durationMs: Date.now() - saveStartedAt,
        }),
      )
      showSaveFeedback(usedFallbackSave ? 'fallback' : 'saved')
    } catch (error) {
      console.warn('Stop dual video recording failed', error)
      trackCaptureAnalytics(() => trackCaptureFailure('video'))
      showSaveFeedback('failed')
    } finally {
      await Promise.all(
        finishPromises.map(async promise => {
          const video = await promise.catch(() => null)
          await safeUnlinkFile(video ? toFileUri(video.filePath) : undefined)
        }),
      )
      recordersRef.current = {}
      recordingFinishedRef.current = []
      setRecording(false)
      setRecordingSeconds(0)
      setRecordingBusy(false)
    }
  }

  const handleShutter = async () => {
    if (captureBusyRef.current || captureBusy || recordingBusy) return

    setPanel(null)
    if (mode === 'photo') {
      await runCaptureCountdown()
      await capturePhotos()
      return
    }
    if (recording) {
      await stopVideoRecording()
    } else {
      await runCaptureCountdown()
      await startVideoRecording()
    }
  }

  useVolumeButtonShutter({
    enabled: volumeShutterEnabled && !galleryOpen,
    onPress: handleShutter,
  })

  const openMenuItem = (action: 'gallery' | 'settings') => {
    setPanel(null)
    if (action === 'gallery') openGallery()
    if (action === 'settings') setPanel('topMenuSettings')
  }

  const rearExposureRange = getExposureRange(rearCameraControllerRef.current)
  const frontExposureRange = getExposureRange(frontCameraControllerRef.current)
  const professionalQuickPanelBottom = insets.bottom + 244
  const professionalStripVisible =
    proMode &&
    (panel === null ||
      panel === 'proQuickIso' ||
      panel === 'proQuickShutter' ||
      panel === 'proQuickFocus')
  const getRealtimePreviewContent = (side: CameraSide) =>
    realtimeFilterEnabled ? (
      <RealtimeFilteredPreviewSurface
        previewOutput={previewOutputs[side]}
        texture={realtimeTextures[side]}
      />
    ) : undefined
  const primaryPreviewContent = getRealtimePreviewContent(primaryCamera)
  const secondaryPreviewContent = getRealtimePreviewContent(secondaryCamera)

  return (
    <View style={styles.root}>
      <View style={styles.preview}>
        {layout === 'split' ? (
          <>
            <CameraPane
              label={primaryLabel}
              previewOutput={previewOutputs[primaryCamera]}
              previewContent={primaryPreviewContent}
              statusText={previewStatusText}
              ratio={ratio}
              gridEnabled={gridEnabled}
              focusLocked={focusLocked}
              onUnlockFocus={toggleFocusLock}
              onViewportLayout={handlePrimaryViewportLayout}
            />
            <View style={styles.splitDivider} />
            <CameraPane
              label={secondaryLabel}
              previewOutput={previewOutputs[secondaryCamera]}
              previewContent={secondaryPreviewContent}
              statusText={previewStatusText}
              ratio={ratio}
              gridEnabled={gridEnabled}
              secondary
            />
          </>
        ) : (
          <CameraPane
            label={primaryLabel}
            previewOutput={previewOutputs[primaryCamera]}
            previewContent={primaryPreviewContent}
            statusText={previewStatusText}
            ratio={ratio}
            gridEnabled={gridEnabled}
            focusLocked={focusLocked}
            onUnlockFocus={toggleFocusLock}
            onViewportLayout={handlePrimaryViewportLayout}
            full
          />
        )}

        {isPip && (
          <View
            style={[
              styles.pip,
              !pipBorderVisible && styles.pipNoBorder,
              {
                left: pipPosition.x,
                top: pipPosition.y,
              },
            ]}
            {...pipPanResponder.panHandlers}
          >
            <View
              style={[
                styles.pipInner,
                !pipBorderVisible && styles.pipInnerNoBorder,
              ]}
            >
              {secondaryPreviewContent ? (
                <RealtimeFilteredPreviewSurface
                  previewOutput={previewOutputs[secondaryCamera]}
                  texture={realtimeTextures[secondaryCamera]}
                />
              ) : (
                <CameraPreviewSurface
                  previewOutput={previewOutputs[secondaryCamera]}
                  compact
                  style={styles.pipPreviewSurface}
                />
              )}
              <Text style={styles.pipLabel}>{secondaryLabel}</Text>
            </View>
          </View>
        )}

        {panel && (
          <Pressable
            style={styles.panelDismissLayer}
            onPress={closeFloatingPanels}
          />
        )}

        {topVisible && (
          <TopCameraToolbar
            top={insets.top + 14}
            selectedLens={selectedLens}
            flashMode={flashMode}
            flashAvailable={rearHasFlash}
            flashIndicatorVisible={flashIndicatorEnabled}
            captureMode={mode}
            stabilizationMode={stabilizationMode}
            stabilizationAvailable={stabilizationOptions.length > 0}
            reduceTransparency={reduceTransparencyEnabled}
            onToggleLensPanel={() => setPanel(panel === 'zoom' ? null : 'zoom')}
            onToggleFlashMode={toggleFlashMode}
            onToggleStabilizationMode={toggleStabilizationMode}
            onToggleMenu={() => setPanel(panel === 'menu' ? null : 'menu')}
          />
        )}

        {panel === 'zoom' && (
          <LensPickerPanel
            top={insets.top + 68}
            lensOptions={lensOptions}
            selectedLensId={selectedLensId}
            onSelectLens={selectLens}
          />
        )}

        {professionalStripVisible && (
          <ProfessionalStatusStrip
            bottom={insets.bottom + 196}
            iso={proISO}
            shutterDuration={proShutterDuration}
            focusPosition={proFocusPosition}
            onPressPro={() => setPanel('topMenuProfessional')}
            onPressISO={() =>
              setPanel(panel === 'proQuickIso' ? null : 'proQuickIso')
            }
            onPressShutter={() =>
              setPanel(panel === 'proQuickShutter' ? null : 'proQuickShutter')
            }
            onPressFocus={() =>
              setPanel(panel === 'proQuickFocus' ? null : 'proQuickFocus')
            }
          />
        )}

        {panel === 'proQuickIso' && (
          <ProfessionalQuickAdjustPanel
            bottom={professionalQuickPanelBottom}
            mode="iso"
            iso={proISO}
            minISO={rearController?.minISO || 1}
            maxISO={rearController?.maxISO || Math.max(1, proISO)}
            shutterDuration={proShutterDuration}
            shutterOptions={professionalShutterOptions}
            focusPosition={proFocusPosition}
            onPreviewISO={previewProfessionalISO}
            onCommitISO={commitProfessionalISO}
            onSelectShutter={selectProfessionalShutter}
            onPreviewFocus={previewProfessionalFocusPosition}
            onCommitFocus={commitProfessionalFocusPosition}
          />
        )}

        {panel === 'proQuickShutter' && (
          <ProfessionalQuickAdjustPanel
            bottom={professionalQuickPanelBottom}
            mode="shutter"
            iso={proISO}
            minISO={rearController?.minISO || 1}
            maxISO={rearController?.maxISO || Math.max(1, proISO)}
            shutterDuration={proShutterDuration}
            shutterOptions={professionalShutterOptions}
            focusPosition={proFocusPosition}
            onPreviewISO={previewProfessionalISO}
            onCommitISO={commitProfessionalISO}
            onSelectShutter={selectProfessionalShutter}
            onPreviewFocus={previewProfessionalFocusPosition}
            onCommitFocus={commitProfessionalFocusPosition}
          />
        )}

        {panel === 'proQuickFocus' && (
          <ProfessionalQuickAdjustPanel
            bottom={professionalQuickPanelBottom}
            mode="focus"
            iso={proISO}
            minISO={rearController?.minISO || 1}
            maxISO={rearController?.maxISO || Math.max(1, proISO)}
            shutterDuration={proShutterDuration}
            shutterOptions={professionalShutterOptions}
            focusPosition={proFocusPosition}
            onPreviewISO={previewProfessionalISO}
            onCommitISO={commitProfessionalISO}
            onSelectShutter={selectProfessionalShutter}
            onPreviewFocus={previewProfessionalFocusPosition}
            onCommitFocus={commitProfessionalFocusPosition}
          />
        )}

        {bottomVisible && (
          <BottomCameraToolbar
            mode={mode}
            layoutLabel={layoutLabel}
            recording={recording}
            recordingSeconds={recordingSeconds}
            captureBusy={captureBusy}
            recordingBusy={recordingBusy}
            shutterScale={shutterScale}
            reduceTransparency={reduceTransparencyEnabled}
            onSetPhotoMode={() => {
              if (recording) {
                stopVideoRecording()
              }
              setMode('photo')
            }}
            onSetVideoMode={() => setMode('video')}
            onToggleLayout={() =>
              setLayout(value => (value === 'pip' ? 'split' : 'pip'))
            }
            onOpenGallery={openGallery}
            onFlipPrimaryCamera={() =>
              setPrimaryCamera(value => (value === 'rear' ? 'front' : 'rear'))
            }
            onPressShutter={handleShutter}
            onToggleQuickPanel={() =>
              setPanel(panel === 'quick' ? null : 'quick')
            }
          />
        )}

        {panel === 'menu' && (
          <MoreMenuPanel
            top={insets.top + 68}
            proMode={proMode}
            onOpenProfessional={() => setPanel('topMenuProfessional')}
            onOpenDisplay={() => setPanel('topMenuDisplay')}
            onOpenFilter={() => setPanel('topMenuFilter')}
            onOpenAi={() => setPanel('topMenuAi')}
            onOpenAnalytics={() => setPanel('topMenuAnalytics')}
            onOpenGallery={() => openMenuItem('gallery')}
            onOpenSettings={() => openMenuItem('settings')}
          />
        )}

        {panel === 'topMenuProfessional' && (
          <TopMenuProfessionalPanel
            top={insets.top + 68}
            enabled={proMode}
            exposureSupported={supportsProfessionalExposure}
            focusSupported={supportsProfessionalFocus}
            iso={proISO}
            minISO={rearController?.minISO || 1}
            maxISO={rearController?.maxISO || Math.max(1, proISO)}
            shutterDuration={proShutterDuration}
            shutterOptions={professionalShutterOptions}
            focusPosition={proFocusPosition}
            onToggleEnabled={toggleProfessionalMode}
            onPreviewISO={previewProfessionalISO}
            onCommitISO={commitProfessionalISO}
            onSelectShutter={selectProfessionalShutter}
            onPreviewFocusPosition={previewProfessionalFocusPosition}
            onCommitFocusPosition={commitProfessionalFocusPosition}
            onBack={() => setPanel('menu')}
            onClose={() => setPanel(null)}
          />
        )}

        {panel === 'topMenuDisplay' && (
          <TopMenuDisplayPanel
            top={insets.top + 68}
            showTopBar={showTopBar}
            showBottomBar={showBottomBar}
            onToggleTopBar={handleTopBarVisibilityChange}
            onToggleBottomBar={handleBottomBarVisibilityChange}
            onBack={() => setPanel('menu')}
            onClose={() => setPanel(null)}
          />
        )}

        {panel === 'topMenuFilter' && (
          <TopMenuFilterPanel
            top={insets.top + 68}
            selectedFilterId={selectedFilterId}
            selectedRenderQuality={filterRenderQuality}
            onSelectFilter={selectFilter}
            onSelectRenderQuality={setFilterRenderQuality}
            onBack={() => setPanel('menu')}
            onClose={() => setPanel(null)}
          />
        )}

        {panel === 'topMenuAi' && (
          <TopMenuAiEnhancePanel
            top={insets.top + 68}
            smartHDREnabled={smartHDREnabled && photoHDRSupported}
            smartHDRSupported={photoHDRSupported}
            lowLightBoostEnabled={lowLightBoostEnabled}
            lowLightBoostSupported={
              rearController?.device.supportsLowLightBoost || false
            }
            smoothFocusEnabled={smoothFocusEnabled}
            smoothFocusSupported={
              rearController?.device.supportsSmoothAutoFocus || false
            }
            distortionCorrectionEnabled={distortionCorrectionEnabled}
            distortionCorrectionSupported={
              rearController?.device.supportsDistortionCorrection || false
            }
            onToggleSmartHDR={toggleSmartHDR}
            onToggleLowLightBoost={toggleLowLightBoost}
            onToggleSmoothFocus={toggleSmoothFocus}
            onToggleDistortionCorrection={toggleDistortionCorrection}
            onBack={() => setPanel('menu')}
            onClose={() => setPanel(null)}
          />
        )}

        {panel === 'topMenuAnalytics' && (
          <TopMenuCaptureAnalyticsPanel
            top={insets.top + 68}
            stats={captureAnalyticsStats}
            enabled={captureAnalyticsEnabled}
            onToggleEnabled={toggleCaptureAnalyticsSetting}
            onReset={resetLocalCaptureAnalytics}
            onBack={() => setPanel('menu')}
            onClose={() => setPanel(null)}
          />
        )}

        {panel === 'topMenuSettings' && (
          <TopMenuSettingsPanel
            top={insets.top + 68}
            gridEnabled={gridEnabled}
            captureTimerEnabled={captureTimerMode !== 'off'}
            photoHDREnabled={photoHDREnabled && photoHDRSupported}
            photoHDRSupported={photoHDRSupported}
            lensSwitchHintEnabled={lensSwitchHintEnabled}
            videoResolution={videoResolution}
            dualVideoComposeMode={dualVideoComposeMode}
            videoSaveMode={videoSaveMode}
            proVideoEnabled={proVideoEnabled}
            volumeShutterEnabled={volumeShutterEnabled}
            pipBorderVisible={pipBorderVisible}
            reduceTransparencyEnabled={reduceTransparencyEnabled}
            flashIndicatorEnabled={flashIndicatorEnabled}
            aiSceneEnabled={aiSceneEnabled}
            captureAnalyticsEnabled={captureAnalyticsEnabled}
            onToggleGrid={setGridEnabled}
            onToggleCaptureTimer={toggleTimedCaptureSetting}
            onTogglePhotoHDR={togglePhotoHDRSetting}
            onToggleLensSwitchHint={setLensSwitchHintEnabled}
            onSetVideoResolution={selectVideoResolution}
            onSetDualVideoComposeMode={setDualVideoComposeMode}
            onSetVideoSaveMode={setVideoSaveMode}
            onToggleProVideo={toggleProVideoSetting}
            onToggleVolumeShutter={toggleVolumeShutterSetting}
            onTogglePipBorder={togglePipBorderSetting}
            onToggleReduceTransparency={setReduceTransparencyEnabled}
            onToggleFlashIndicator={setFlashIndicatorEnabled}
            onToggleAiScene={setAiSceneEnabled}
            onToggleCaptureAnalytics={toggleCaptureAnalyticsSetting}
            onBack={() => setPanel('menu')}
            onClose={() => setPanel(null)}
          />
        )}

        {panel === 'quick' && (
          <QuickSettingsPanel
            ratios={ratios}
            ratio={ratio}
            captureTimerMode={captureTimerMode}
            photoSaveMode={photoSaveMode}
            focusLocked={focusLocked}
            rearExposure={rearExposureBias}
            frontExposure={frontExposureBias}
            rearWhiteBalancePreset={rearWhiteBalancePreset}
            frontWhiteBalancePreset={frontWhiteBalancePreset}
            onChangeRatio={setRatio}
            onToggleCaptureTimer={toggleCaptureTimer}
            onChangePhotoSaveMode={setPhotoSaveMode}
            onToggleFocusLock={toggleFocusLock}
            onOpenExposurePanel={() => setPanel('exposure')}
            onOpenWhiteBalancePanel={() => setPanel('whiteBalance')}
          />
        )}

        {panel === 'exposure' && (
          <ExposureControlPanel
            rearExposure={rearExposureBias}
            frontExposure={frontExposureBias}
            rearRange={rearExposureRange}
            frontRange={frontExposureRange}
            onChangeRearExposure={value => applyExposureBias('rear', value)}
            onChangeFrontExposure={value => applyExposureBias('front', value)}
            onResetRearExposure={() => resetExposureBias('rear')}
            onResetFrontExposure={() => resetExposureBias('front')}
            onClose={() => setPanel('quick')}
          />
        )}

        {panel === 'whiteBalance' && (
          <WhiteBalanceControlPanel
            primaryLabel="后摄像头"
            secondaryLabel="前摄像头"
            rearPreset={rearWhiteBalancePreset}
            frontPreset={frontWhiteBalancePreset}
            rearSupported={
              rearCameraControllerRef.current?.device
                .supportsWhiteBalanceLocking || false
            }
            frontSupported={
              frontCameraControllerRef.current?.device
                .supportsWhiteBalanceLocking || false
            }
            onChangeRearPreset={preset =>
              applyWhiteBalancePreset('rear', preset)
            }
            onChangeFrontPreset={preset =>
              applyWhiteBalancePreset('front', preset)
            }
            onClose={() => setPanel('quick')}
          />
        )}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.captureFlash,
          {
            opacity: captureFlashOpacity,
          },
        ]}
      />
      <SaveFeedbackToast feedback={saveFeedback} bottom={insets.bottom + 132} />
      <ControlStatusToast
        message={controlStatusMessage}
        bottom={insets.bottom + 224}
      />
      <GalleryModal
        visible={galleryOpen}
        assets={galleryAssets}
        loading={galleryLoading}
        onClose={() => setGalleryOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  preview: { flex: 1, backgroundColor: '#020303' },
  panelDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  splitDivider: { height: 2, backgroundColor: 'rgba(255,255,255,0.16)' },
  pip: {
    position: 'absolute',
    width: 142,
    height: 184,
    borderRadius: pipCornerRadius,
    padding: 2,
    backgroundColor: 'rgba(0,0,0,0.38)',
    zIndex: 4,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  pipNoBorder: {
    padding: 0,
    backgroundColor: 'transparent',
  },
  pipInner: {
    flex: 1,
    borderRadius: pipCornerRadius - 2,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  pipInnerNoBorder: {
    borderRadius: pipCornerRadius,
  },
  pipPreviewSurface: {
    borderRadius: pipCornerRadius - 2,
    backgroundColor: 'transparent',
  },
  pipLabel: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '400',
  },
  captureFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
})

export default DualCamera
