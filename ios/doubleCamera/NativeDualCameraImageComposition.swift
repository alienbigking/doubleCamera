// Core Image 合成工具：计算输出尺寸、裁切缩放画面并绘制画中画遮罩和边框。
import AVFoundation
import CoreImage
import Foundation

extension NativeDualCameraView {
  /// 根据主画面尺寸、目标比例和长边上限计算照片导出尺寸。
  func outputSize(
    for primarySize: CGSize,
    aspectRatio: CGFloat,
    maxLongSide: CGFloat
  ) -> CGSize {
    guard primarySize.width > 0, primarySize.height > 0 else {
      return .zero
    }

    let sourceLongSide = max(primarySize.width, primarySize.height)
    // 原生双摄帧来自实时预览，尺寸可能小于照片导出尺寸；保持所选输出尺寸，不回退到预览尺寸。
    let longSide = maxLongSide > 0 ? maxLongSide : sourceLongSide
    guard aspectRatio > 0 else {
      let scale = longSide / sourceLongSide
      return CGSize(
        width: round(primarySize.width * scale),
        height: round(primarySize.height * scale)
      )
    }

    if aspectRatio >= 1 {
      return CGSize(width: round(longSide), height: round(longSide / aspectRatio))
    }

    return CGSize(width: round(longSide * aspectRatio), height: round(longSide))
  }

  /// 按填充策略缩放并裁切输入图像，使其完整覆盖目标区域。
  func aspectFill(_ image: CIImage, in rect: CGRect) -> CIImage {
    let imageSize = image.extent.size
    guard rect.width > 0, rect.height > 0, imageSize.width > 0, imageSize.height > 0 else {
      return image.cropped(to: .zero)
    }

    let scale = max(rect.width / imageSize.width, rect.height / imageSize.height)
    let scaledWidth = imageSize.width * scale
    let scaledHeight = imageSize.height * scale
    return
      image
      .transformed(by: CGAffineTransform(scaleX: scale, y: scale))
      .transformed(
        by: CGAffineTransform(
          translationX: rect.midX - scaledWidth / 2,
          y: rect.midY - scaledHeight / 2
        )
      )
      .cropped(to: rect)
  }

  /// 将预览坐标系中的小窗位置映射到输出图像坐标系。
  func mapPipRect(_ pipRect: CGRect, from previewSize: CGSize, to outputSize: CGSize) -> CGRect {
    let scaleX = outputSize.width / max(previewSize.width, 1)
    let scaleY = outputSize.height / max(previewSize.height, 1)
    let pipScale = min(scaleX, scaleY)
    let width = pipRect.width * pipScale
    let height = pipRect.height * pipScale
    let x = min(max(12, pipRect.minX * scaleX), outputSize.width - width - 12)
    let y = min(max(12, pipRect.minY * scaleY), outputSize.height - height - 12)
    return CGRect(x: x, y: y, width: width, height: height)
  }

  /// 将 UIKit 顶部原点坐标转换为 Core Image 底部原点坐标。
  func ciRect(fromTopLeft rect: CGRect, outputSize: CGSize) -> CGRect {
    CGRect(
      x: rect.minX,
      y: outputSize.height - rect.minY - rect.height,
      width: rect.width,
      height: rect.height
    )
  }

  /// 将裁圆角的小窗和可选边框合成到背景图像上。
  func renderPip(
    image: CIImage,
    over background: CIImage,
    in rect: CGRect,
    outputSize: CGSize,
    previewSize: CGSize,
    pipBorderVisible: Bool
  ) -> CIImage {
    let clippedImage = aspectFill(image, in: rect)
    let radius = min(rect.width, rect.height) * 0.12
    let roundedMask = roundedRectMask(for: rect, radius: radius)
    let pipLayer = clippedImage.applyingFilter(
      "CIBlendWithAlphaMask",
      parameters: [
        kCIInputMaskImageKey: roundedMask
      ]
    )
    guard pipBorderVisible else {
      return pipLayer.composited(over: background)
    }

    let borderImage = borderOverlay(for: rect, radius: radius, lineWidth: 2)
    return borderImage.composited(over: pipLayer).composited(over: background)
  }

  func roundedRectMask(for rect: CGRect, radius: CGFloat) -> CIImage {
    let filter = CIFilter(name: "CIRoundedRectangleGenerator")!
    filter.setValue(CIVector(cgRect: rect), forKey: "inputExtent")
    filter.setValue(radius, forKey: "inputRadius")
    filter.setValue(CIColor(red: 1, green: 1, blue: 1, alpha: 1), forKey: "inputColor")
    return filter.outputImage!.cropped(to: rect)
  }

  func borderOverlay(for rect: CGRect, radius: CGFloat, lineWidth: CGFloat) -> CIImage {
    let outer = roundedRectMask(for: rect, radius: radius)
    let innerRect = rect.insetBy(dx: lineWidth, dy: lineWidth)
    let inner = roundedRectMask(for: innerRect, radius: max(0, radius - lineWidth))
      .applyingFilter("CIColorInvert")
      .cropped(to: rect)

    let ring = inner.composited(over: outer)
    return ring.applyingFilter(
      "CIColorMatrix",
      parameters: [
        "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputAVector": CIVector(x: 0, y: 0, z: 0.32, w: 0),
      ]
    )
  }
}
