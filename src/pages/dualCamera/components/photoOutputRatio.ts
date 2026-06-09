type Size = { width: number; height: number }

const fixedRatioAspectMap: Record<string, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '5:4': 5 / 4,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
}

const isValidSize = (size?: Size) =>
  Boolean(size && size.width > 0 && size.height > 0)

// 照片输出比例工具：让保存成片的裁切比例和当前取景比例保持一致。
export const resolvePhotoOutputAspectRatio = ({
  ratio,
  previewSize,
}: {
  ratio?: string
  previewSize?: Size
}) => {
  if (ratio && fixedRatioAspectMap[ratio]) {
    return fixedRatioAspectMap[ratio]
  }

  if (ratio === '全屏' && isValidSize(previewSize)) {
    return previewSize!.width / previewSize!.height
  }

  return undefined
}

export const fitSizeToAspectRatio = (
  baseSize: Size,
  aspectRatio?: number,
): Size => {
  if (!aspectRatio || aspectRatio <= 0) {
    return baseSize
  }

  const longSide = Math.max(baseSize.width, baseSize.height)

  if (aspectRatio >= 1) {
    return {
      width: longSide,
      height: Math.round(longSide / aspectRatio),
    }
  }

  return {
    width: Math.round(longSide * aspectRatio),
    height: longSide,
  }
}
