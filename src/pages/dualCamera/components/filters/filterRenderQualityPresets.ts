export type DualCameraFilterRenderQuality = 'standard' | '4k'

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
      maxLongSide: 2560,
      jpegQuality: 92,
    },
    {
      id: '4k',
      label: '4K',
      description: '优先导出 4K 尺寸，细节更多',
      maxLongSide: 4032,
      jpegQuality: 96,
    },
  ]

export const getDualCameraFilterRenderQualityPreset = (
  quality: DualCameraFilterRenderQuality,
) =>
  dualCameraFilterRenderQualityPresets.find(item => item.id === quality) ||
  dualCameraFilterRenderQualityPresets[0]
