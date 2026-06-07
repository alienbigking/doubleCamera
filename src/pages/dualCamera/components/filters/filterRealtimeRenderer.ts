import {
  Skia,
  type SkCanvas,
  type SkImage,
  type SkPaint,
} from '@shopify/react-native-skia'
import {
  getDualCameraFilterPreset,
  type DualCameraFilterId,
} from './filterPresets'
import { blendModeMap, toColorWithOpacity } from './filterRenderingUtils'

export type RealtimeFilterRenderAssets = {
  imagePaint?: SkPaint
  overlayPaint?: SkPaint
}

// 实时滤镜绘制资源：把保存成片时复用的矩阵与叠色规则转换成实时预览可直接使用的 Paint。
export const createRealtimeFilterRenderAssets = (
  filterId: DualCameraFilterId,
): RealtimeFilterRenderAssets => {
  const filter = getDualCameraFilterPreset(filterId)
  const assets: RealtimeFilterRenderAssets = {}

  if (filter.photoMatrix) {
    const imagePaint = Skia.Paint()
    imagePaint.setAntiAlias(true)
    imagePaint.setColorFilter(Skia.ColorFilter.MakeMatrix(filter.photoMatrix))
    assets.imagePaint = imagePaint
  }

  if (filter.photoBlend) {
    const overlayPaint = Skia.Paint()
    overlayPaint.setAntiAlias(true)
    overlayPaint.setBlendMode(blendModeMap[filter.photoBlend.mode])
    overlayPaint.setColor(
      Skia.Color(
        toColorWithOpacity(filter.photoBlend.color, filter.photoBlend.opacity),
      ),
    )
    assets.overlayPaint = overlayPaint
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
  canvas.drawImage(frameTexture, 0, 0, assets.imagePaint)

  if (assets.overlayPaint) {
    canvas.drawRect(
      Skia.XYWHRect(0, 0, frameTexture.width(), frameTexture.height()),
      assets.overlayPaint,
    )
  }
}
