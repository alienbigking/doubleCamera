export type DualCameraFilterRenderQuality = 'standard' | 'high'

export type DualCameraFilterRenderQualityPreset = {
  id: DualCameraFilterRenderQuality
  label: string
  description: string
  maxLongSide: number
  jpegQuality: number
}

export const dualCameraFilterRenderQualityPresets: DualCameraFilterRenderQualityPreset[] =
  [
    {
      id: 'standard',
      label: '标准',
      description: '保存更快，发热更低',
      maxLongSide: 1440,
      jpegQuality: 88,
    },
    {
      id: 'high',
      label: '高质量',
      description: '细节更完整，保存更慢',
      maxLongSide: 1920,
      jpegQuality: 92,
    },
  ]

export const getDualCameraFilterRenderQualityPreset = (
  quality: DualCameraFilterRenderQuality,
) =>
  dualCameraFilterRenderQualityPresets.find(item => item.id === quality) ||
  dualCameraFilterRenderQualityPresets[0]
