import RNFS from 'react-native-fs'
import { NativeModules, Platform } from 'react-native'
import {
  ClipOp,
  PaintStyle,
  Skia,
  type SkData,
  type SkImage,
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
import { writeSkiaJpegToPath } from './skiaImageExport'

type CameraSide = 'rear' | 'front'
type Point = { x: number; y: number }
type Size = { width: number; height: number }
type CapturedPhotoFiles = Record<CameraSide, string> & { capturedAt: string }
type LoadedImage = { image: SkImage; data?: SkData }
type DualPhotoComposerModule = {
  composeDualPhoto: (
    rearPhotoPath: string,
    frontPhotoPath: string,
    layout: LayoutMode,
    pipX: number,
    pipY: number,
    pipWidth: number,
    pipHeight: number,
    previewWidth: number,
    previewHeight: number,
    aspectRatio: number,
    maxLongSide: number,
    jpegQuality: number,
    primaryCamera: CameraSide,
    pipBorderVisible: boolean,
  ) => Promise<string>
}

const nativeComposer = NativeModules.DualPhotoComposer as
  | DualPhotoComposerModule
  | undefined

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

const disposeLoadedImage = ({ image, data }: LoadedImage) => {
  image.dispose()
  data?.dispose()
}

const loadImage = async (uri: string): Promise<LoadedImage> => {
  const directData = await Skia.Data.fromURI(ensureFileUri(uri)).catch(
    () => null,
  )
  const directImage = directData
    ? Skia.Image.MakeImageFromEncoded(directData)
    : null

  if (directImage) {
    return { image: directImage, data: directData || undefined }
  }

  directData?.dispose()
  throw new Error(`Failed to decode image without Base64 fallback: ${uri}`)
}

const fitCanvasSize = (
  image: SkImage,
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
  const outputAspectRatio =
    resolvePhotoOutputAspectRatio({
      ratio,
      previewSize,
    }) || 0
  const qualityPreset = getDualCameraFilterRenderQualityPreset(renderQuality)

  if (Platform.OS === 'ios' && nativeComposer?.composeDualPhoto) {
    return nativeComposer.composeDualPhoto(
      stripFileScheme(photos.rear),
      stripFileScheme(photos.front),
      layout,
      pipPosition.x,
      pipPosition.y,
      pipSize.width,
      pipSize.height,
      previewSize.width,
      previewSize.height,
      outputAspectRatio,
      qualityPreset.maxLongSide,
      qualityPreset.jpegQuality,
      primaryCamera,
      pipBorderVisible,
    )
  }

  const secondaryCamera: CameraSide =
    primaryCamera === 'rear' ? 'front' : 'rear'
  let primaryLoadedImage: LoadedImage | undefined
  let secondaryLoadedImage: LoadedImage | undefined

  try {
    primaryLoadedImage = await loadImage(photos[primaryCamera])
    secondaryLoadedImage = await loadImage(photos[secondaryCamera])

    const primaryImage = primaryLoadedImage.image
    const secondaryImage = secondaryLoadedImage.image
    const fittedPrimarySize = fitCanvasSize(primaryImage, renderQuality)
    const fittedOutputSize = fitSizeToAspectRatio(
      fittedPrimarySize,
      outputAspectRatio || undefined,
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
      const outputPath = createOutputPath()
      await writeSkiaJpegToPath(snapshot, outputPath, qualityPreset.jpegQuality)

      return `file://${outputPath}`
    } finally {
      snapshot?.dispose()
      surface.dispose()
    }
  } finally {
    if (primaryLoadedImage) {
      disposeLoadedImage(primaryLoadedImage)
    }
    if (secondaryLoadedImage) {
      disposeLoadedImage(secondaryLoadedImage)
    }
  }
}
