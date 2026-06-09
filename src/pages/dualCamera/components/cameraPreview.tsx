import React, { type ReactNode, useMemo } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import type {
  GestureResponderEvent,
  LayoutRectangle,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { callback } from 'react-native-nitro-modules'
import {
  NativePreviewView,
  type CameraPreviewOutput,
  type PreviewView,
} from 'react-native-vision-camera'

const compactCornerRadius = 32
const ratioAspectMap: Record<string, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '5:4': 5 / 4,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
}

const getAspectRatio = (ratio?: string) =>
  ratio ? ratioAspectMap[ratio] : undefined

export const CameraPane = ({
  label,
  full,
  secondary,
  previewOutput,
  previewContent,
  statusText,
  ratio,
  gridEnabled = true,
  focusLocked,
  onUnlockFocus,
  onViewportLayout,
  onPreviewRef,
  onTapFocus,
  tapFocusPoint,
}: {
  label: string
  full?: boolean
  secondary?: boolean
  previewOutput?: CameraPreviewOutput
  previewContent?: ReactNode
  statusText?: string
  ratio?: string
  gridEnabled?: boolean
  focusLocked?: boolean
  onUnlockFocus?: () => void
  onViewportLayout?: (layout: LayoutRectangle) => void
  onPreviewRef?: (preview: PreviewView | null) => void
  onTapFocus?: (event: GestureResponderEvent) => void
  tapFocusPoint?: { x: number; y: number } | null
}) => {
  const aspectRatio = getAspectRatio(ratio)

  return (
    <View
      style={[
        styles.cameraPane,
        full && styles.cameraPaneFull,
        secondary && styles.cameraPaneSecondary,
      ]}
    >
      <View
        style={[
          styles.ratioViewport,
          aspectRatio
            ? [styles.ratioViewportFixed, { aspectRatio }]
            : styles.ratioViewportFull,
        ]}
        onLayout={event => onViewportLayout?.(event.nativeEvent.layout)}
      >
        {previewContent || (
          <CameraPreviewSurface
            previewOutput={previewOutput}
            onPreviewRef={onPreviewRef}
          />
        )}
        {gridEnabled && (
          <View style={styles.gridOverlay}>
            <View style={styles.gridLineV} />
            <View style={[styles.gridLineV, { left: '66.66%' }]} />
            <View style={styles.gridLineH} />
            <View style={[styles.gridLineH, { top: '66.66%' }]} />
          </View>
        )}
        {focusLocked && <FocusLockIndicator onUnlockFocus={onUnlockFocus} />}
        {tapFocusPoint && <TapFocusIndicator point={tapFocusPoint} />}
        {onTapFocus && (
          <Pressable
            style={styles.tapFocusLayer}
            onPress={onTapFocus}
            pointerEvents="box-only"
          />
        )}
        <Text style={styles.cameraLabel}>{label}</Text>
      </View>
      {statusText && (
        <View style={styles.previewStatus}>
          <Text style={styles.previewStatusText}>{statusText}</Text>
        </View>
      )}
    </View>
  )
}

// 对焦锁定指示组件：在主取景区域显示锁焦框，提示当前对焦已固定。
const FocusLockIndicator = ({
  onUnlockFocus,
}: {
  onUnlockFocus?: () => void
}) => (
  <View pointerEvents="box-none" style={styles.focusLockIndicator}>
    <View style={[styles.focusCorner, styles.focusCornerTopLeft]} />
    <View style={[styles.focusCorner, styles.focusCornerTopRight]} />
    <View style={[styles.focusCorner, styles.focusCornerBottomLeft]} />
    <View style={[styles.focusCorner, styles.focusCornerBottomRight]} />
    <TouchableOpacity
      style={styles.focusLockBadge}
      activeOpacity={0.78}
      disabled={!onUnlockFocus}
      onPress={onUnlockFocus}
    >
      <MaterialIcons name="lock" color="#ffe66d" size={15} />
      <Text style={styles.focusLockText}>AF LOCK</Text>
    </TouchableOpacity>
  </View>
)

const TapFocusIndicator = ({ point }: { point: { x: number; y: number } }) => (
  <View
    pointerEvents="none"
    style={[
      styles.tapFocusIndicator,
      {
        left: point.x - tapFocusIndicatorSize / 2,
        top: point.y - tapFocusIndicatorSize / 2,
      },
    ]}
  >
    <View style={[styles.tapFocusCorner, styles.tapFocusCornerTopLeft]} />
    <View style={[styles.tapFocusCorner, styles.tapFocusCornerTopRight]} />
    <View style={[styles.tapFocusCorner, styles.tapFocusCornerBottomLeft]} />
    <View style={[styles.tapFocusCorner, styles.tapFocusCornerBottomRight]} />
  </View>
)

export const CameraPreviewSurface = ({
  previewOutput,
  compact,
  style,
  onPreviewRef,
}: {
  previewOutput?: CameraPreviewOutput
  compact?: boolean
  style?: StyleProp<ViewStyle>
  onPreviewRef?: (preview: PreviewView | null) => void
}) => {
  const previewHybridRef = useMemo(
    () =>
      callback((preview: PreviewView | null) => {
        onPreviewRef?.(preview)
      }),
    [onPreviewRef],
  )

  if (!previewOutput) {
    return (
      <View
        style={[
          styles.previewSurface,
          compact && styles.previewSurfaceCompact,
          style,
        ]}
      >
        <View
          style={[styles.previewMedia, compact && styles.previewMediaCompact]}
        >
          <CameraTexture compact={compact} />
        </View>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.previewSurface,
        compact && styles.previewSurfaceCompact,
        style,
      ]}
    >
      <View
        style={[styles.previewMedia, compact && styles.previewMediaCompact]}
      >
        <NativePreviewView
          style={[styles.nativePreview, compact && styles.nativePreviewCompact]}
          previewOutput={previewOutput}
          hybridRef={previewHybridRef}
          resizeMode="cover"
          implementationMode="compatible"
        />
      </View>
    </View>
  )
}

const CameraTexture = ({
  compact,
  style,
}: {
  compact?: boolean
  style?: StyleProp<ViewStyle>
}) => (
  <View style={[styles.texture, compact && styles.textureCompact, style]}>
    <View style={styles.neonLine} />
    <View style={[styles.neonLine, styles.neonLineTwo]} />
    <View style={styles.lightBand} />
  </View>
)

const tapFocusIndicatorSize = 78

const styles = StyleSheet.create({
  cameraPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#071012',
  },
  cameraPaneFull: { ...StyleSheet.absoluteFillObject },
  cameraPaneSecondary: { backgroundColor: '#0d1216' },
  ratioViewport: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  ratioViewportFull: {
    flex: 1,
    alignSelf: 'stretch',
  },
  ratioViewportFixed: {
    width: '100%',
    maxHeight: '100%',
  },
  previewSurface: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  previewSurfaceCompact: { borderRadius: compactCornerRadius },
  previewMedia: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  previewMediaCompact: { borderRadius: compactCornerRadius },
  nativePreview: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  nativePreviewCompact: { borderRadius: compactCornerRadius },
  texture: { ...StyleSheet.absoluteFillObject, backgroundColor: '#06090a' },
  textureCompact: { borderRadius: compactCornerRadius },
  neonLine: {
    position: 'absolute',
    top: '18%',
    left: '8%',
    width: '88%',
    height: 2,
    backgroundColor: 'rgba(92, 255, 219, 0.55)',
    transform: [{ rotate: '-18deg' }],
  },
  neonLineTwo: {
    top: '34%',
    left: '28%',
    width: '62%',
    backgroundColor: 'rgba(80, 200, 255, 0.4)',
    transform: [{ rotate: '72deg' }],
  },
  lightBand: {
    position: 'absolute',
    top: '38%',
    left: '-10%',
    width: '120%',
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-2deg' }],
  },
  gridOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.26 },
  tapFocusLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
  tapFocusIndicator: {
    position: 'absolute',
    zIndex: 9,
    width: tapFocusIndicatorSize,
    height: tapFocusIndicatorSize,
  },
  tapFocusCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#ffe66d',
  },
  tapFocusCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  tapFocusCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  tapFocusCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  tapFocusCornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  focusLockIndicator: {
    position: 'absolute',
    zIndex: 10,
    alignSelf: 'center',
    top: '42%',
    width: 116,
    height: 86,
  },
  focusCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#ffe66d',
  },
  focusCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  focusCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  focusCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  focusCornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  focusLockBadge: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -30,
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,230,109,0.42)',
  },
  focusLockText: {
    color: '#ffe66d',
    fontSize: 10,
    fontWeight: '400',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cameraLabel: {
    position: 'absolute',
    left: 18,
    bottom: 26,
    color: 'rgba(255,255,255,0.42)',
    fontSize: 13,
    fontWeight: '400',
  },
  previewStatus: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '46%',
    alignItems: 'center',
  },
  previewStatusText: {
    overflow: 'hidden',
    maxWidth: '100%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '400',
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
})
