export type CaptureMode = 'photo' | 'video'
export type LayoutMode = 'pip' | 'split'
export type Panel =
  | 'menu'
  | 'quick'
  | 'zoom'
  | 'exposure'
  | 'whiteBalance'
  | null
export type PhotoSaveMode = 'combined' | 'separate' | 'combinedAndSeparate'
export type CaptureTimerMode = 'off' | '3s' | '10s'
export type WhiteBalancePreset = 'auto' | 'cool' | 'natural' | 'warm'
export type SaveFeedback = 'saving' | 'saved' | null
export type FlashMode = 'off' | 'auto' | 'on'
export type StabilizationMode = 'off' | 'standard' | 'cinematic'

export type LensOption = {
  id: string
  label: string
  shortLabel: string
  zoomLabel: string
  zoomValue: number
}
