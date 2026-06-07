import type { ViewStyle } from 'react-native'

export type DualCameraFilterId =
  | 'none'
  | 'vivid'
  | 'film'
  | 'cool'
  | 'warm'
  | 'mono'
  | 'fade'

type PreviewOverlayLayer = {
  color: string
  opacity: number
}

type PreviewFilterValue = NonNullable<ViewStyle['filter']>

type PhotoBlendModeName = 'overlay' | 'softLight' | 'screen' | 'multiply'

export type DualCameraPhotoBlend = {
  color: string
  opacity: number
  mode: PhotoBlendModeName
}

export type DualCameraFilterPreset = {
  id: DualCameraFilterId
  label: string
  shortLabel: string
  description: string
  previewFilters?: PreviewFilterValue
  previewOverlays?: PreviewOverlayLayer[]
  photoMatrix?: number[]
  photoBlend?: DualCameraPhotoBlend
}

const identityMatrix = (): number[] => [
  1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
]

const toFiveByFive = (matrix: number[]) => [
  [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4]],
  [matrix[5], matrix[6], matrix[7], matrix[8], matrix[9]],
  [matrix[10], matrix[11], matrix[12], matrix[13], matrix[14]],
  [matrix[15], matrix[16], matrix[17], matrix[18], matrix[19]],
  [0, 0, 0, 0, 1],
]

const fromFiveByFive = (matrix: number[][]): number[] => [
  matrix[0][0],
  matrix[0][1],
  matrix[0][2],
  matrix[0][3],
  matrix[0][4],
  matrix[1][0],
  matrix[1][1],
  matrix[1][2],
  matrix[1][3],
  matrix[1][4],
  matrix[2][0],
  matrix[2][1],
  matrix[2][2],
  matrix[2][3],
  matrix[2][4],
  matrix[3][0],
  matrix[3][1],
  matrix[3][2],
  matrix[3][3],
  matrix[3][4],
]

const concatColorMatrices = (outer: number[], inner: number[]) => {
  const a = toFiveByFive(outer)
  const b = toFiveByFive(inner)
  const result = Array.from({ length: 5 }, () => Array(5).fill(0))

  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      let value = 0
      for (let index = 0; index < 5; index += 1) {
        value += a[row][index] * b[index][column]
      }
      result[row][column] = value
    }
  }

  return fromFiveByFive(result)
}

const createSaturationMatrix = (saturation: number) => {
  const r = 0.2126
  const g = 0.7152
  const b = 0.0722
  const inv = 1 - saturation

  return [
    inv * r + saturation,
    inv * g,
    inv * b,
    0,
    0,
    inv * r,
    inv * g + saturation,
    inv * b,
    0,
    0,
    inv * r,
    inv * g,
    inv * b + saturation,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ]
}

const createContrastMatrix = (contrast: number) => {
  const offset = (1 - contrast) / 2
  return [
    contrast,
    0,
    0,
    0,
    offset,
    0,
    contrast,
    0,
    0,
    offset,
    0,
    0,
    contrast,
    0,
    offset,
    0,
    0,
    0,
    1,
    0,
  ]
}

const createBrightnessMatrix = (offset: number) => {
  const normalizedOffset = offset / 255

  return [
    1,
    0,
    0,
    0,
    normalizedOffset,
    0,
    1,
    0,
    0,
    normalizedOffset,
    0,
    0,
    1,
    0,
    normalizedOffset,
    0,
    0,
    0,
    1,
    0,
  ]
}

const createChannelScaleMatrix = (
  redScale: number,
  greenScale: number,
  blueScale: number,
) => [
  redScale,
  0,
  0,
  0,
  0,
  0,
  greenScale,
  0,
  0,
  0,
  0,
  0,
  blueScale,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
]

const buildFilterMatrix = ({
  saturation = 1,
  contrast = 1,
  brightness = 0,
  redScale = 1,
  greenScale = 1,
  blueScale = 1,
}: {
  saturation?: number
  contrast?: number
  brightness?: number
  redScale?: number
  greenScale?: number
  blueScale?: number
}) =>
  [
    createChannelScaleMatrix(redScale, greenScale, blueScale),
    createSaturationMatrix(saturation),
    createContrastMatrix(contrast),
    createBrightnessMatrix(brightness),
  ].reduce(
    (matrix, current) => concatColorMatrices(current, matrix),
    identityMatrix(),
  )

export const dualCameraFilterPresets: DualCameraFilterPreset[] = [
  {
    id: 'none',
    label: '原图',
    shortLabel: '原图',
    description: '保留自然色彩',
  },
  {
    id: 'vivid',
    label: '鲜明',
    shortLabel: '鲜明',
    description: '提升饱和度和对比度',
    previewFilters: [
      { saturate: 1.18 },
      { contrast: 1.06 },
      { brightness: 1.02 },
    ],
    previewOverlays: [{ color: '#ff8a3d', opacity: 0.08 }],
    photoMatrix: buildFilterMatrix({
      saturation: 1.18,
      contrast: 1.06,
      brightness: 4,
      redScale: 1.02,
      blueScale: 1.01,
    }),
  },
  {
    id: 'film',
    label: '胶片',
    shortLabel: '胶片',
    description: '暖色胶片质感',
    previewFilters: [
      { saturate: 0.94 },
      { contrast: 1.04 },
      { brightness: 0.98 },
      { sepia: 0.2 },
    ],
    previewOverlays: [
      { color: '#d89152', opacity: 0.1 },
      { color: '#24324a', opacity: 0.06 },
    ],
    photoMatrix: buildFilterMatrix({
      saturation: 0.94,
      contrast: 1.04,
      brightness: -4,
      redScale: 1.06,
      greenScale: 0.99,
      blueScale: 0.94,
    }),
    photoBlend: { color: '#dea96c', opacity: 0.12, mode: 'softLight' },
  },
  {
    id: 'cool',
    label: '冷调',
    shortLabel: '冷调',
    description: '偏蓝冷色氛围',
    previewFilters: [{ saturate: 1.02 }, { contrast: 1.02 }],
    previewOverlays: [{ color: '#4d88ff', opacity: 0.12 }],
    photoMatrix: buildFilterMatrix({
      saturation: 1.02,
      contrast: 1.02,
      redScale: 0.95,
      greenScale: 1,
      blueScale: 1.08,
    }),
  },
  {
    id: 'warm',
    label: '暖调',
    shortLabel: '暖调',
    description: '偏橙暖色氛围',
    previewFilters: [{ saturate: 1.04 }, { contrast: 1.01 }],
    previewOverlays: [{ color: '#ffb16b', opacity: 0.12 }],
    photoMatrix: buildFilterMatrix({
      saturation: 1.04,
      contrast: 1.01,
      redScale: 1.08,
      greenScale: 1.01,
      blueScale: 0.94,
    }),
  },
  {
    id: 'mono',
    label: '黑白',
    shortLabel: '黑白',
    description: '高对比黑白风格',
    previewFilters: [
      { grayscale: 1 },
      { contrast: 1.08 },
      { brightness: 0.99 },
    ],
    photoMatrix: buildFilterMatrix({
      saturation: 0,
      contrast: 1.08,
      brightness: -2,
    }),
  },
  {
    id: 'fade',
    label: '褪色',
    shortLabel: '褪色',
    description: '低饱和柔和色调',
    previewFilters: [
      { saturate: 0.82 },
      { contrast: 0.9 },
      { brightness: 1.05 },
    ],
    previewOverlays: [{ color: '#efe2d1', opacity: 0.12 }],
    photoMatrix: buildFilterMatrix({
      saturation: 0.82,
      contrast: 0.9,
      brightness: 10,
      redScale: 1.02,
      greenScale: 1,
      blueScale: 0.98,
    }),
  },
]

export const getDualCameraFilterPreset = (filterId: DualCameraFilterId) =>
  dualCameraFilterPresets.find(filter => filter.id === filterId) ||
  dualCameraFilterPresets[0]
