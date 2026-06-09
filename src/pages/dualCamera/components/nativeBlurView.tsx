import React from 'react'
import {
  Platform,
  requireNativeComponent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { BlurView as MaintainedBlurView } from '@sbaiahmed1/react-native-blur'
import type { BlurViewProps as MaintainedBlurViewProps } from '@sbaiahmed1/react-native-blur'

type NativeBlurViewProps = {
  blurStyle?: string
  blurAmount?: number
  style?: StyleProp<ViewStyle>
  useFallbackNative?: boolean
}

const IOSNativeBlurView =
  Platform.OS === 'ios'
    ? requireNativeComponent<NativeBlurViewProps>('NativeBlurView')
    : undefined

const toMaintainedBlurType = (
  blurStyle: string,
): MaintainedBlurViewProps['blurType'] => {
  switch (blurStyle) {
    case 'systemUltraThinMaterialDark':
    case 'systemThinMaterialDark':
    case 'systemMaterialDark':
    case 'systemThickMaterialDark':
    case 'systemChromeMaterialDark':
    case 'dark':
    case 'extraDark':
      return blurStyle as MaintainedBlurViewProps['blurType']
    case 'systemUltraThinMaterialLight':
    case 'systemThinMaterialLight':
    case 'systemMaterialLight':
    case 'systemThickMaterialLight':
    case 'systemChromeMaterialLight':
    case 'xlight':
    case 'light':
      return blurStyle as MaintainedBlurViewProps['blurType']
    case 'regular':
    case 'prominent':
    case 'systemUltraThinMaterial':
    case 'systemThinMaterial':
    case 'systemMaterial':
    case 'systemThickMaterial':
    case 'systemChromeMaterial':
      return blurStyle as MaintainedBlurViewProps['blurType']
    default:
      return 'systemUltraThinMaterialDark'
  }
}

export const NativeBlurView = ({
  blurStyle = 'systemUltraThinMaterial',
  blurAmount = 28,
  style,
  useFallbackNative = false,
}: NativeBlurViewProps) => {
  if (useFallbackNative && IOSNativeBlurView) {
    return <IOSNativeBlurView blurStyle={blurStyle} style={style} />
  }

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <MaintainedBlurView
        blurAmount={blurAmount}
        blurType={toMaintainedBlurType(blurStyle)}
        ignoreSafeArea
        overlayColor="rgba(255,255,255,0.02)"
        reducedTransparencyFallbackColor="rgba(10,12,14,0.34)"
        style={style}
      />
    )
  }

  return <View pointerEvents="none" style={[styles.fallback, style]} />
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(2,3,3,0.52)',
  },
})
