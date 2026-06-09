export type DualCameraFilterRenderQuality = 'standard' | 'original' | 'high'

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
      id: 'original',
      label: '原图',
      description: '保留原始尺寸，保存更慢',
      maxLongSide: Number.POSITIVE_INFINITY,
      jpegQuality: 95,
    },
    {
      id: 'high',
      label: '高清',
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
