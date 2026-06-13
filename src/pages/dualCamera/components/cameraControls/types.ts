export type CaptureMode = 'photo' | 'video'
export type LayoutMode = 'pip' | 'split'
export type Panel =
  | 'menu'
  | 'topMenuProfessional'
  | 'topMenuDisplay'
  | 'topMenuFilter'
  | 'topMenuAi'
  | 'topMenuAnalytics'
  | 'topMenuSettings'
  | 'topMenuAbout'
  | 'topMenuLanguage'
  | 'proQuickIso'
  | 'proQuickShutter'
  | 'proQuickFocus'
  | 'quick'
  | 'zoom'
  | 'exposure'
  | 'whiteBalance'
  | null
export type PhotoSaveMode = 'combined' | 'separate' | 'combinedAndSeparate'
export type VideoSaveMode = 'combined' | 'separate' | 'combinedAndSeparate'
export type CaptureTimerMode = 'off' | '3s' | '10s'
export type WhiteBalancePreset = 'auto' | 'cool' | 'natural' | 'warm'
export type SaveFeedback = 'saving' | 'saved' | 'fallback' | 'failed' | null
export type FlashMode = 'off' | 'auto' | 'on'
export type StabilizationMode = 'off' | 'standard' | 'cinematic'
export type VideoResolutionMode = '720p' | '1080p' | '4k'
export type VideoFrameRateMode = 24 | 30 | 60
export type AudioChannelMode = 'off' | 'mono' | 'stereo'
export type AudioQualityMode = 'standard' | 'high' | 'max'
export type DualVideoComposeMode = 'pip' | 'split'

export type LensOption = {
  id: string
  label: string
  shortLabel: string
  zoomLabel: string
  zoomValue: number
}
