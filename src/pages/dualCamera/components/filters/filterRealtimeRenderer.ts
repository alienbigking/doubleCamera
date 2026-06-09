import {
  BlendMode,
  Skia,
  type SkCanvas,
  type SkImage,
} from '@shopify/react-native-skia'
import {
  getDualCameraFilterPreset,
  type DualCameraFilterId,
} from './filterPresets'
import { blendModeMap, toColorWithOpacity } from './filterRenderingUtils'

export type RealtimeFilterRenderAssets = {
  matrix?: number[]
  overlay?: {
    color: string
    mode: BlendMode
  }
}

// 实时滤镜绘制配置：只保存可序列化数据，避免 SkPaint HostObject 跨帧复用后被释放。
export const createRealtimeFilterRenderAssets = (
  filterId: DualCameraFilterId,
): RealtimeFilterRenderAssets => {
  const filter = getDualCameraFilterPreset(filterId)
  const assets: RealtimeFilterRenderAssets = {}

  if (filter.photoMatrix) {
    assets.matrix = filter.photoMatrix
  }

  if (filter.photoBlend) {
    assets.overlay = {
      color: toColorWithOpacity(
        filter.photoBlend.color,
        filter.photoBlend.opacity,
      ),
      mode: blendModeMap[filter.photoBlend.mode],
    }
  }

  return assets
}

// 实时滤镜绘制：让主预览与拍照成片尽量使用同一套色彩矩阵与叠色规则。
export const drawRealtimeFilteredFrame = ({
  canvas,
  frameTexture,
  assets,
}: {
  canvas: SkCanvas
  frameTexture: SkImage
  assets: RealtimeFilterRenderAssets
}) => {
  'worklet'

  const imagePaint = assets.matrix ? Skia.Paint() : undefined

  if (imagePaint && assets.matrix) {
    imagePaint.setAntiAlias(true)
    imagePaint.setColorFilter(Skia.ColorFilter.MakeMatrix(assets.matrix))
  }

  canvas.drawImage(frameTexture, 0, 0, imagePaint)

  if (assets.overlay) {
    const overlayPaint = Skia.Paint()
    overlayPaint.setAntiAlias(true)
    overlayPaint.setBlendMode(assets.overlay.mode)
    overlayPaint.setColor(Skia.Color(assets.overlay.color))
    canvas.drawRect(
      Skia.XYWHRect(0, 0, frameTexture.width(), frameTexture.height()),
      overlayPaint,
    )
  }
}
