import RNFS from 'react-native-fs'
import {
  ClipOp,
  ImageFormat,
  PaintStyle,
  Skia,
  type SkRect,
} from '@shopify/react-native-skia'
import type { LayoutMode } from './cameraControls'
import {
  drawFilteredImageRect,
  getDualCameraFilterRenderQualityPreset,
  type DualCameraFilterId,
  type DualCameraFilterRenderQuality,
  type ProfessionalToneAdjustments,
} from './filters'
import {
  fitSizeToAspectRatio,
  resolvePhotoOutputAspectRatio,
} from './photoOutputRatio'

type CameraSide = 'rear' | 'front'
type Point = { x: number; y: number }
type Size = { width: number; height: number }
type CapturedPhotoFiles = Record<CameraSide, string> & { capturedAt: string }

export type ComposePhotoOptions = {
  photos: CapturedPhotoFiles
  layout: LayoutMode
  primaryCamera: CameraSide
  pipPosition: Point
  pipSize: Size
  previewSize: Size
  ratio: string
  filterId: DualCameraFilterId
  renderQuality: DualCameraFilterRenderQuality
  toneAdjustments?: ProfessionalToneAdjustments
  pipBorderVisible?: boolean
}

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
  image: Awaited<ReturnType<typeof loadImage>>,
  renderQuality: DualCameraFilterRenderQuality,
): Size => {
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

const createOutputPath = () =>
  `${RNFS.CachesDirectoryPath}/dualcam-combined-${Date.now()}.jpg`

// 双摄照片合成工具：用 Skia 将前后摄照片合成为画中画或上下分屏成片。
export const composeDualPhoto = async ({
  photos,
  layout,
  primaryCamera,
  pipPosition,
  pipSize,
  previewSize,
  ratio,
  filterId,
  renderQuality,
  toneAdjustments,
  pipBorderVisible = true,
}: ComposePhotoOptions) => {
  const secondaryCamera: CameraSide =
    primaryCamera === 'rear' ? 'front' : 'rear'
  const primaryImage = await loadImage(photos[primaryCamera])
  const secondaryImage = await loadImage(photos[secondaryCamera])

  try {
    const fittedPrimarySize = fitCanvasSize(primaryImage, renderQuality)
    const outputAspectRatio = resolvePhotoOutputAspectRatio({
      ratio,
      previewSize,
    })
    const fittedOutputSize = fitSizeToAspectRatio(
      fittedPrimarySize,
      outputAspectRatio,
    )
    const canvasSize =
      layout === 'split'
        ? {
            width: fittedOutputSize.width,
            height: fittedOutputSize.height,
          }
        : fittedOutputSize
    const surface = Skia.Surface.MakeOffscreen(
      canvasSize.width,
      canvasSize.height,
    )

    if (!surface) {
      throw new Error('Failed to create Skia offscreen surface')
    }

    let snapshot:
      | Awaited<ReturnType<typeof surface.makeImageSnapshot>>
      | undefined

    try {
      const canvas = surface.getCanvas()
      canvas.clear(Skia.Color('#000000'))

      if (layout === 'split') {
        const topRect = Skia.XYWHRect(
          0,
          0,
          canvasSize.width,
          canvasSize.height / 2,
        )
        const bottomRect = Skia.XYWHRect(
          0,
          canvasSize.height / 2,
          canvasSize.width,
          canvasSize.height / 2,
        )
        drawFilteredImageRect({
          canvas,
          image: primaryImage,
          destRect: topRect,
          filterId,
          toneAdjustments,
        })
        drawFilteredImageRect({
          canvas,
          image: secondaryImage,
          destRect: bottomRect,
          filterId,
          toneAdjustments,
        })
      } else {
        const mainRect = Skia.XYWHRect(
          0,
          0,
          canvasSize.width,
          canvasSize.height,
        )
        drawFilteredImageRect({
          canvas,
          image: primaryImage,
          destRect: mainRect,
          filterId,
          toneAdjustments,
        })

        const scaleX = canvasSize.width / previewSize.width
        const scaleY = canvasSize.height / previewSize.height
        const pipScale = Math.min(scaleX, scaleY)
        const insetWidth = pipSize.width * pipScale
        const insetHeight = pipSize.height * pipScale
        const insetRect = Skia.XYWHRect(
          Math.min(
            Math.max(12, pipPosition.x * scaleX),
            canvasSize.width - insetWidth - 12,
          ),
          Math.min(
            Math.max(12, pipPosition.y * scaleY),
            canvasSize.height - insetHeight - 12,
          ),
          insetWidth,
          insetHeight,
        )
        const insetRadius = Math.min(insetRect.width, insetRect.height) * 0.18
        canvas.save()
        canvas.clipRRect(
          Skia.RRectXY(insetRect, insetRadius, insetRadius),
          ClipOp.Intersect,
          true,
        )
        drawFilteredImageRect({
          canvas,
          image: secondaryImage,
          destRect: insetRect,
          filterId,
          toneAdjustments,
        })
        canvas.restore()

        if (pipBorderVisible) {
          const borderPaint = Skia.Paint()
          borderPaint.setAntiAlias(true)
          borderPaint.setStyle(PaintStyle.Stroke)
          borderPaint.setStrokeWidth(Math.max(2, Math.min(scaleX, scaleY) * 2))
          borderPaint.setColor(Skia.Color('rgba(0,0,0,0.38)'))
          canvas.drawRRect(
            Skia.RRectXY(insetRect, insetRadius, insetRadius),
            borderPaint,
          )
        }
      }

      surface.flush()
      snapshot = surface.makeImageSnapshot()
      const { jpegQuality } =
        getDualCameraFilterRenderQualityPreset(renderQuality)
      const outputBase64 = snapshot.encodeToBase64(
        ImageFormat.JPEG,
        jpegQuality,
      )
      const outputPath = createOutputPath()
      await RNFS.writeFile(outputPath, outputBase64, 'base64')

      return `file://${outputPath}`
    } finally {
      snapshot?.dispose()
      surface.dispose()
    }
  } finally {
    primaryImage.dispose()
    secondaryImage.dispose()
  }
}
