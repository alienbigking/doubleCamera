export type ProfessionalToneAdjustments = {
  exposure: number
  brightness: number
  highlights: number
  shadows: number
  contrast: number
  saturation: number
  temperature: number
  tint: number
}

export type ProfessionalToneAdjustmentKey = keyof ProfessionalToneAdjustments

export const defaultProfessionalToneAdjustments: ProfessionalToneAdjustments = {
  exposure: 0,
  brightness: 0,
  highlights: 0,
  shadows: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
}

export const professionalToneAdjustmentItems: {
  key: ProfessionalToneAdjustmentKey
  label: string
}[] = [
  { key: 'exposure', label: '曝光' },
  { key: 'brightness', label: '亮度' },
  { key: 'highlights', label: '高光' },
  { key: 'shadows', label: '阴影' },
  { key: 'contrast', label: '对比度' },
  { key: 'saturation', label: '饱和度' },
  { key: 'temperature', label: '色温' },
  { key: 'tint', label: '色调' },
]

export const clampToneAdjustment = (value: number) =>
  Math.min(100, Math.max(-100, Math.round(value)))

export const hasProfessionalToneAdjustments = (
  adjustments: ProfessionalToneAdjustments,
) =>
  professionalToneAdjustmentItems.some(
    item => clampToneAdjustment(adjustments[item.key]) !== 0,
  )

export const formatToneAdjustmentValue = (value: number) => {
  const rounded = clampToneAdjustment(value)
  if (rounded === 0) return '0'
  return rounded > 0 ? `+${rounded}` : String(rounded)
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

export const concatColorMatrices = (outer: number[], inner: number[]) => {
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

const createBrightnessMatrix = (offset: number) => [
  1,
  0,
  0,
  0,
  offset,
  0,
  1,
  0,
  0,
  offset,
  0,
  0,
  1,
  0,
  offset,
  0,
  0,
  0,
  1,
  0,
]

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

export const buildProfessionalToneMatrix = (
  adjustments: ProfessionalToneAdjustments,
) => {
  const exposure = clampToneAdjustment(adjustments.exposure) / 100
  const brightness = clampToneAdjustment(adjustments.brightness) / 100
  const highlights = clampToneAdjustment(adjustments.highlights) / 100
  const shadows = clampToneAdjustment(adjustments.shadows) / 100
  const contrast = clampToneAdjustment(adjustments.contrast) / 100
  const saturation = clampToneAdjustment(adjustments.saturation) / 100
  const temperature = clampToneAdjustment(adjustments.temperature) / 100
  const tint = clampToneAdjustment(adjustments.tint) / 100

  const exposureScale = Math.pow(2, exposure * 0.85)
  const brightnessOffset = brightness * 0.18 + highlights * 0.07 + shadows * 0.1
  const contrastScale = Math.max(
    0.55,
    1 + contrast * 0.42 + highlights * 0.12 - shadows * 0.14,
  )
  const saturationScale = Math.max(0, 1 + saturation * 0.55)
  const redScale = Math.max(
    0,
    exposureScale * (1 + temperature * 0.12 + tint * 0.04),
  )
  const greenScale = Math.max(0, exposureScale * (1 - Math.abs(tint) * 0.06))
  const blueScale = Math.max(
    0,
    exposureScale * (1 - temperature * 0.12 + tint * 0.04),
  )

  return [
    createChannelScaleMatrix(redScale, greenScale, blueScale),
    createSaturationMatrix(saturationScale),
    createContrastMatrix(contrastScale),
    createBrightnessMatrix(brightnessOffset),
  ].reduce(
    (matrix, current) => concatColorMatrices(current, matrix),
    identityMatrix(),
  )
}

export const mergeColorMatrixWithToneAdjustments = (
  matrix: number[] | undefined,
  adjustments: ProfessionalToneAdjustments,
) => {
  if (!hasProfessionalToneAdjustments(adjustments)) return matrix

  const toneMatrix = buildProfessionalToneMatrix(adjustments)
  return matrix ? concatColorMatrices(toneMatrix, matrix) : toneMatrix
}
