import { BlendMode } from '@shopify/react-native-skia'
import { getDualCameraFilterPreset } from './filterPresets'

export const blendModeMap: Record<
  NonNullable<
    ReturnType<typeof getDualCameraFilterPreset>['photoBlend']
  >['mode'],
  BlendMode
> = {
  overlay: BlendMode.Overlay,
  softLight: BlendMode.SoftLight,
  screen: BlendMode.Screen,
  multiply: BlendMode.Multiply,
}

export const toColorWithOpacity = (color: string, opacity: number) => {
  if (color.startsWith('#')) {
    const hex = color.slice(1)

    if (hex.length === 3) {
      const [r, g, b] = hex.split('')
      return `rgba(${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(
        b + b,
        16,
      )}, ${opacity})`
    }

    if (hex.length === 6) {
      return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(
        hex.slice(2, 4),
        16,
      )}, ${parseInt(hex.slice(4, 6), 16)}, ${opacity})`
    }
  }

  if (color.startsWith('rgb(')) {
    return color.replace(/^rgb\((.+)\)$/, `rgba($1, ${opacity})`)
  }

  if (color.startsWith('rgba(')) {
    return color.replace(
      /^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/,
      (_, red, green, blue) => `rgba(${red},${green},${blue},${opacity})`,
    )
  }

  return color
}
