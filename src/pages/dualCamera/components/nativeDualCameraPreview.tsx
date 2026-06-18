import React from 'react'
import {
  Platform,
  NativeModules,
  type NativeSyntheticEvent,
  requireNativeComponent,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import type { LayoutMode } from './cameraControls'

type NativeDualCameraPreviewProps = {
  active: boolean
  layoutMode: LayoutMode
  primaryCamera: 'rear' | 'front'
  pipX: number
  pipY: number
  pipWidth: number
  pipHeight: number
  pipBorderVisible: boolean
  frameCaptureEnabled?: boolean
  dualPreviewEnabled?: boolean
  onReady?: (event: NativeSyntheticEvent<NativeDualCameraReadyEvent>) => void
  onError?: (event: NativeSyntheticEvent<NativeDualCameraErrorEvent>) => void
  style?: StyleProp<ViewStyle>
}

type NativeDualCameraReadyEvent = {
  rearFrameReady: boolean
  frontFrameReady: boolean
  stableReady?: boolean
}

type NativeDualCameraErrorEvent = {
  message?: string
}

export type NativeDualCameraPhotoResult = {
  combinedUri: string
  width?: number
  height?: number
}

export type NativeDualCameraRecordedVideo = {
  side: 'rear' | 'front'
  filePath: string
}

type NativeCameraTestModule = {
  showMinimalCamera: () => Promise<void>
}

type NativeDualCameraViewManagerModule = {
  capturePhoto: (options: {
    layout: LayoutMode
    primaryCamera: 'rear' | 'front'
    pipX: number
    pipY: number
    pipWidth: number
    pipHeight: number
    previewWidth: number
    previewHeight: number
    aspectRatio: number
    maxLongSide: number
    jpegQuality: number
    pipBorderVisible: boolean
  }) => Promise<NativeDualCameraPhotoResult | string>
  focusPrimaryAtPoint: (options: {
    x: number
    y: number
  }) => Promise<void>
  startVideoRecording: (options: {
    resolution: '720p' | '1080p' | '4k'
    frameRate: number
    audioEnabled?: boolean
    audioChannels?: number
    audioSampleRate?: number
  }) => Promise<void>
  stopVideoRecording: () => Promise<NativeDualCameraRecordedVideo[]>
}

export const NativeDualCameraController =
  NativeModules.NativeDualCameraViewManager as
    | NativeDualCameraViewManagerModule
    | undefined

export const NativeCameraTestController =
  NativeModules.NativeCameraTestModule as NativeCameraTestModule | undefined

let NativeDualCameraView:
  | ReturnType<typeof requireNativeComponent<NativeDualCameraPreviewProps>>
  | null
  | undefined

const getNativeDualCameraView = () => {
  if (Platform.OS !== 'ios') return null
  if (NativeDualCameraView === undefined) {
    NativeDualCameraView =
      requireNativeComponent<NativeDualCameraPreviewProps>(
        'NativeDualCameraView',
      )
  }
  return NativeDualCameraView
}

export const NativeDualCameraPreview = ({
  active,
  layoutMode,
  primaryCamera,
  pipX,
  pipY,
  pipWidth,
  pipHeight,
  pipBorderVisible,
  frameCaptureEnabled = false,
  dualPreviewEnabled = false,
  onReady,
  onError,
  style,
}: NativeDualCameraPreviewProps) => {
  const NativeView = getNativeDualCameraView()

  if (!NativeView) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>Native dual camera is iOS only</Text>
      </View>
    )
  }

  return (
    <NativeView
      style={style}
      active={active}
      layoutMode={layoutMode}
      primaryCamera={primaryCamera}
      pipX={pipX}
      pipY={pipY}
      pipWidth={pipWidth}
      pipHeight={pipHeight}
      pipBorderVisible={pipBorderVisible}
      frameCaptureEnabled={frameCaptureEnabled}
      dualPreviewEnabled={dualPreviewEnabled}
      onReady={onReady}
      onError={onError}
    />
  )
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    backgroundColor: '#000',
    flex: 1,
    justifyContent: 'center',
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
  },
})
