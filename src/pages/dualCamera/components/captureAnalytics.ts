import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  DualVideoComposeMode,
  FlashMode,
  PhotoSaveMode,
  StabilizationMode,
  VideoResolutionMode,
  VideoSaveMode,
} from './cameraControls'
import type {
  DualCameraFilterId,
  DualCameraFilterRenderQuality,
} from './filters'

const captureAnalyticsStorageKey = 'doubleCamera:captureAnalytics:v1'

export type CaptureAnalyticsAction =
  | 'photo'
  | 'video'
  | 'filter'
  | 'flash'
  | 'stabilization'
  | 'aiEnhancement'
  | 'professional'
  | 'timer'

export type CaptureAnalyticsStats = {
  version: 1
  createdAt: string
  updatedAt: string
  photoCount: number
  dualPhotoCount: number
  separatePhotoCount: number
  combinedAndSeparatePhotoCount: number
  videoCount: number
  failedPhotoCount: number
  failedVideoCount: number
  savePermissionDeniedCount: number
  totalPhotoSaveDurationMs: number
  totalVideoSaveDurationMs: number
  filterUsage: Record<string, number>
  photoSaveModeUsage: Record<PhotoSaveMode, number>
  videoResolutionUsage: Record<VideoResolutionMode, number>
  videoSaveModeUsage: Record<VideoSaveMode, number>
  dualVideoComposeModeUsage: Record<DualVideoComposeMode, number>
  flashUsage: Record<FlashMode, number>
  stabilizationUsage: Record<StabilizationMode, number>
  timerUsage: Record<string, number>
  aiEnhancementUsage: Record<string, number>
  professionalModeUsage: Record<string, number>
  realtimeFilteredPhotoCount: number
  lastCaptureAt?: string
  lastVideoAt?: string
}

type TrackPhotoSavedInput = {
  saveMode: PhotoSaveMode
  filterId: DualCameraFilterId
  filterRenderQuality: DualCameraFilterRenderQuality
  durationMs: number
}

type TrackVideoSavedInput = {
  resolution: VideoResolutionMode
  composeMode: DualVideoComposeMode
  saveMode: VideoSaveMode
  stabilizationMode: StabilizationMode
  durationMs: number
}

type TrackActionInput = {
  action: CaptureAnalyticsAction
  value: string
}

const nowISOString = () => new Date().toISOString()

const createInitialStats = (): CaptureAnalyticsStats => {
  const now = nowISOString()

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

const increment = <T extends string>(
  target: Record<T, number>,
  key: T,
  amount = 1,
) => {
  target[key] = (target[key] || 0) + amount
}

const normalizeStats = (value: unknown): CaptureAnalyticsStats => ({
  ...createInitialStats(),
  ...(typeof value === 'object' && value != null ? value : {}),
})

export const getCaptureAnalyticsStats =
  async (): Promise<CaptureAnalyticsStats> => {
    const rawValue = await AsyncStorage.getItem(captureAnalyticsStorageKey)
    if (!rawValue) return createInitialStats()

    try {
      return normalizeStats(JSON.parse(rawValue))
    } catch {
      return createInitialStats()
    }
  }

const updateCaptureAnalyticsStats = async (
  updater: (stats: CaptureAnalyticsStats) => CaptureAnalyticsStats,
) => {
  const currentStats = await getCaptureAnalyticsStats()
  const nextStats = updater(currentStats)
  nextStats.updatedAt = nowISOString()
  await AsyncStorage.setItem(
    captureAnalyticsStorageKey,
    JSON.stringify(nextStats),
  )
  return nextStats
}

export const resetCaptureAnalyticsStats = async () => {
  const nextStats = createInitialStats()
  await AsyncStorage.setItem(
    captureAnalyticsStorageKey,
    JSON.stringify(nextStats),
  )
  return nextStats
}

export const trackPhotoSaved = (input: TrackPhotoSavedInput) =>
  updateCaptureAnalyticsStats(stats => {
    stats.photoCount += 1
    stats.totalPhotoSaveDurationMs += Math.max(0, input.durationMs)
    stats.lastCaptureAt = nowISOString()
    increment(stats.photoSaveModeUsage, input.saveMode)
    increment(stats.filterUsage, input.filterId)

    if (input.filterId !== 'none') {
      stats.realtimeFilteredPhotoCount += 1
    }

    if (input.saveMode === 'combined') {
      stats.dualPhotoCount += 1
    } else if (input.saveMode === 'separate') {
      stats.separatePhotoCount += 1
    } else {
      stats.combinedAndSeparatePhotoCount += 1
      stats.dualPhotoCount += 1
      stats.separatePhotoCount += 1
    }

    return stats
  })

export const trackVideoSaved = (input: TrackVideoSavedInput) =>
  updateCaptureAnalyticsStats(stats => {
    stats.videoCount += 1
    stats.totalVideoSaveDurationMs += Math.max(0, input.durationMs)
    stats.lastVideoAt = nowISOString()
    increment(stats.videoResolutionUsage, input.resolution)
    increment(stats.videoSaveModeUsage, input.saveMode)
    increment(stats.dualVideoComposeModeUsage, input.composeMode)
    increment(stats.stabilizationUsage, input.stabilizationMode)
    return stats
  })

export const trackCaptureFailure = (type: 'photo' | 'video') =>
  updateCaptureAnalyticsStats(stats => {
    if (type === 'photo') {
      stats.failedPhotoCount += 1
    } else {
      stats.failedVideoCount += 1
    }
    return stats
  })

export const trackSavePermissionDenied = () =>
  updateCaptureAnalyticsStats(stats => {
    stats.savePermissionDeniedCount += 1
    return stats
  })

export const trackCaptureAnalyticsAction = ({
  action,
  value,
}: TrackActionInput) =>
  updateCaptureAnalyticsStats(stats => {
    if (action === 'filter') increment(stats.filterUsage, value)
    if (action === 'flash') increment(stats.flashUsage, value as FlashMode)
    if (action === 'stabilization') {
      increment(stats.stabilizationUsage, value as StabilizationMode)
    }
    if (action === 'timer') increment(stats.timerUsage, value)
    if (action === 'aiEnhancement') {
      increment(stats.aiEnhancementUsage, value)
    }
    if (action === 'professional') {
      increment(stats.professionalModeUsage, value)
    }
    return stats
  })
