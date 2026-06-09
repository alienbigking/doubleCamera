import RNFS from 'react-native-fs'
import {
  ImageFormat,
  Skia,
  type SkCanvas,
  type SkImage,
  type SkRect,
} from '@shopify/react-native-skia'
import {
  getDualCameraFilterPreset,
  type DualCameraFilterId,
} from './filterPresets'
import {
  getDualCameraFilterRenderQualityPreset,
  type DualCameraFilterRenderQuality,
} from './filterRenderQualityPresets'
import { blendModeMap, toColorWithOpacity } from './filterRenderingUtils'
import {
  hasProfessionalToneAdjustments,
  mergeColorMatrixWithToneAdjustments,
  type ProfessionalToneAdjustments,
} from './toneAdjustments'
import {
  fitSizeToAspectRatio,
  resolvePhotoOutputAspectRatio,
} from '../photoOutputRatio'

const stripFileScheme = (uri: string) =>
  uri.startsWith('file://') ? uri.replace('file://', '') : uri

const ensureFileUri = (uri: string) =>
  uri.startsWith('file://') ? uri : `file://${uri}`

const loadImage = async (uri: string) => {
  const directData = await Skia.Data.fromURI(ensureFileUri(uri)).catch(
    () => null,
  )
  const directImage = directData
    ? Skia.Image.MakeImageFromEncoded(directData)
    : null

  if (directImage) {
    return directImage
  }

  const base64 = await RNFS.readFile(stripFileScheme(uri), 'base64')
  const fallbackData = Skia.Data.fromBase64(base64)
  const image = Skia.Image.MakeImageFromEncoded(fallbackData)

  if (!image) {
    throw new Error(`Failed to decode image: ${uri}`)
  }

  return image
}

const fitCanvasSize = (
  image: SkImage,
  renderQuality: DualCameraFilterRenderQuality,
) => {
  const { maxLongSide } = getDualCameraFilterRenderQualityPreset(renderQuality)
  const width = image.width()
  const height = image.height()
  const longSide = Math.max(width, height)
  const scale = longSide > maxLongSide ? maxLongSide / longSide : 1

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

const coverSourceRect = (image: SkImage, dest: SkRect) => {
  const imageWidth = image.width()
  const imageHeight = image.height()
  const imageRatio = imageWidth / imageHeight
  const destRatio = dest.width / dest.height

  if (imageRatio > destRatio) {
    const sourceWidth = imageHeight * destRatio
    return Skia.XYWHRect(
      (imageWidth - sourceWidth) / 2,
      0,
      sourceWidth,
      imageHeight,
    )
  }

  const sourceHeight = imageWidth / destRatio
  return Skia.XYWHRect(
    0,
    (imageHeight - sourceHeight) / 2,
    imageWidth,
    sourceHeight,
  )
}

export const drawFilteredImageRect = ({
  canvas,
  image,
  destRect,
  filterId,
  toneAdjustments,
}: {
  canvas: SkCanvas
  image: SkImage
  destRect: SkRect
  filterId: DualCameraFilterId
  toneAdjustments?: ProfessionalToneAdjustments
}) => {
  const filter = getDualCameraFilterPreset(filterId)
  const matrix = toneAdjustments
    ? mergeColorMatrixWithToneAdjustments(filter.photoMatrix, toneAdjustments)
    : filter.photoMatrix
  const sourceRect = coverSourceRect(image, destRect)
  const paint = Skia.Paint()
  paint.setAntiAlias(true)

  if (matrix) {
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix))
  }

  canvas.drawImageRect(image, sourceRect, destRect, paint, true)

  if (filter.photoBlend) {
    const overlayPaint = Skia.Paint()
    overlayPaint.setAntiAlias(true)
    overlayPaint.setBlendMode(blendModeMap[filter.photoBlend.mode])
    overlayPaint.setColor(
      Skia.Color(
        toColorWithOpacity(filter.photoBlend.color, filter.photoBlend.opacity),
      ),
    )
    canvas.drawRect(destRect, overlayPaint)
  }
}

const createOutputPath = (filterId: DualCameraFilterId) =>
  `${RNFS.CachesDirectoryPath}/dualcam-filter-${filterId}-${Date.now()}.jpg`

// 单张照片滤镜处理：用于分别保存前后摄照片时输出真实滤镜成片。
export const applyFilterToPhoto = async (
  uri: string,
  filterId: DualCameraFilterId,
  renderQuality: DualCameraFilterRenderQuality,
  toneAdjustments?: ProfessionalToneAdjustments,
  outputOptions?: {
    ratio?: string
    previewSize?: { width: number; height: number }
  },
) => {
  const outputAspectRatio = resolvePhotoOutputAspectRatio(outputOptions || {})
  const hasTone = toneAdjustments
    ? hasProfessionalToneAdjustments(toneAdjustments)
    : false

  if (filterId === 'none' && !hasTone && !outputAspectRatio) {
    return uri
  }

  const image = await loadImage(uri)

  try {
    const size = fitSizeToAspectRatio(
      fitCanvasSize(image, renderQuality),
      outputAspectRatio,
    )
    const surface = Skia.Surface.MakeOffscreen(size.width, size.height)

    if (!surface) {
      throw new Error('Failed to create Skia surface for filter output')
    }

    let snapshot: SkImage | undefined

    try {
      const canvas = surface.getCanvas()
      const destRect = Skia.XYWHRect(0, 0, size.width, size.height)
      canvas.clear(Skia.Color('#000000'))
      drawFilteredImageRect({
        canvas,
        image,
        destRect,
        filterId,
        toneAdjustments,
      })

      surface.flush()
      snapshot = surface.makeImageSnapshot()
      const { jpegQuality } =
        getDualCameraFilterRenderQualityPreset(renderQuality)
      const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, jpegQuality)
      const outputPath = createOutputPath(filterId)
      await RNFS.writeFile(outputPath, base64, 'base64')

      return `file://${outputPath}`
    } finally {
      snapshot?.dispose()
      surface.dispose()
    }
  } finally {
    image.dispose()
  }
}
