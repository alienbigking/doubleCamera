import RNFS from 'react-native-fs'
import {
  ClipOp,
  ImageFormat,
  PaintStyle,
  Skia,
  type SkImage,
  type SkRect,
} from '@shopify/react-native-skia'
import type { LayoutMode } from './cameraControls'

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
}

const maxCanvasLongSide = 1600

const stripFileScheme = (uri: string) =>
  uri.startsWith('file://') ? uri.replace('file://', '') : uri

const loadImage = async (uri: string) => {
  const base64 = await RNFS.readFile(stripFileScheme(uri), 'base64')
  const data = Skia.Data.fromBase64(base64)
  const image = Skia.Image.MakeImageFromEncoded(data)

  if (!image) {
    throw new Error(`Failed to decode image: ${uri}`)
  }

  return image
}

const fitCanvasSize = (image: SkImage): Size => {
  const width = image.width()
  const height = image.height()
  const longSide = Math.max(width, height)
  const scale = longSide > maxCanvasLongSide ? maxCanvasLongSide / longSide : 1

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

const coverSourceRect = (image: SkImage, dest: Size): SkRect => {
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

const drawCoverImage = (image: SkImage, dest: SkRect) => {
  const paint = Skia.Paint()
  paint.setAntiAlias(true)

  return {
    paint,
    source: coverSourceRect(image, {
      width: dest.width,
      height: dest.height,
    }),
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
}: ComposePhotoOptions) => {
  const secondaryCamera: CameraSide =
    primaryCamera === 'rear' ? 'front' : 'rear'
  const primaryImage = await loadImage(photos[primaryCamera])
  const secondaryImage = await loadImage(photos[secondaryCamera])
  const canvasSize =
    layout === 'split'
      ? {
          width: fitCanvasSize(primaryImage).width,
          height: Math.round((fitCanvasSize(primaryImage).width * 4) / 3),
        }
      : fitCanvasSize(primaryImage)
  const surface = Skia.Surface.MakeOffscreen(
    canvasSize.width,
    canvasSize.height,
  )

  if (!surface) {
    throw new Error('Failed to create Skia offscreen surface')
  }

  const canvas = surface.getCanvas()
  canvas.clear(Skia.Color('#000000'))

  if (layout === 'split') {
    const topRect = Skia.XYWHRect(0, 0, canvasSize.width, canvasSize.height / 2)
    const bottomRect = Skia.XYWHRect(
      0,
      canvasSize.height / 2,
      canvasSize.width,
      canvasSize.height / 2,
    )
    const topImage = primaryImage
    const bottomImage = secondaryImage
    const top = drawCoverImage(topImage, topRect)
    const bottom = drawCoverImage(bottomImage, bottomRect)
    canvas.drawImageRect(topImage, top.source, topRect, top.paint, true)
    canvas.drawImageRect(
      bottomImage,
      bottom.source,
      bottomRect,
      bottom.paint,
      true,
    )
  } else {
    const mainRect = Skia.XYWHRect(0, 0, canvasSize.width, canvasSize.height)
    const main = drawCoverImage(primaryImage, mainRect)
    canvas.drawImageRect(primaryImage, main.source, mainRect, main.paint, true)

    const scaleX = canvasSize.width / previewSize.width
    const scaleY = canvasSize.height / previewSize.height
    const insetRect = Skia.XYWHRect(
      Math.max(12, pipPosition.x * scaleX),
      Math.max(12, pipPosition.y * scaleY),
      pipSize.width * scaleX,
      pipSize.height * scaleY,
    )
    const insetRadius = Math.min(insetRect.width, insetRect.height) * 0.18
    const inset = drawCoverImage(secondaryImage, insetRect)

    canvas.save()
    canvas.clipRRect(
      Skia.RRectXY(insetRect, insetRadius, insetRadius),
      ClipOp.Intersect,
      true,
    )
    canvas.drawImageRect(
      secondaryImage,
      inset.source,
      insetRect,
      inset.paint,
      true,
    )
    canvas.restore()

    const borderPaint = Skia.Paint()
    borderPaint.setAntiAlias(true)
    borderPaint.setStyle(PaintStyle.Stroke)
    borderPaint.setStrokeWidth(Math.max(3, Math.min(scaleX, scaleY) * 3))
    borderPaint.setColor(Skia.Color('rgba(255,255,255,0.42)'))
    canvas.drawRRect(
      Skia.RRectXY(insetRect, insetRadius, insetRadius),
      borderPaint,
    )
  }

  surface.flush()
  const snapshot = surface.makeImageSnapshot()
  const outputBase64 = snapshot.encodeToBase64(ImageFormat.JPEG, 92)
  const outputPath = createOutputPath()
  await RNFS.writeFile(outputPath, outputBase64, 'base64')

  return `file://${outputPath}`
}
