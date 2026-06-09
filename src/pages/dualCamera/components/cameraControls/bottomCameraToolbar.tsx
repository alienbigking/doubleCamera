import React from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ModeButton } from '../controls'
import type { CaptureMode } from './types'

// 底部拍摄控制栏组件：承载模式切换、布局切换、快门、相册和更多入口。
export const BottomCameraToolbar = ({
  mode,
  layoutLabel,
  recording,
  recordingSeconds,
  captureBusy,
  recordingBusy,
  shutterScale,
  reduceTransparency,
  onSetPhotoMode,
  onSetVideoMode,
  onToggleLayout,
  onOpenGallery,
  onFlipPrimaryCamera,
  onPressShutter,
  onToggleQuickPanel,
}: {
  mode: CaptureMode
  layoutLabel: string
  recording: boolean
  recordingSeconds: number
  captureBusy: boolean
  recordingBusy: boolean
  shutterScale: Animated.Value
  reduceTransparency: boolean
  onSetPhotoMode: () => void
  onSetVideoMode: () => void
  onToggleLayout: () => void
  onOpenGallery: () => void
  onFlipPrimaryCamera: () => void
  onPressShutter: () => void
  onToggleQuickPanel: () => void
}) => (
  <SafeAreaView style={styles.bottomSafe}>
    <View style={styles.bottomArea}>
      <View style={styles.modeTabs}>
        <ModeButton
          active={mode === 'photo'}
          label="拍照"
          onPress={onSetPhotoMode}
        />
        <ModeButton
          active={mode === 'video'}
          label="视频"
          onPress={onSetVideoMode}
        />
      </View>
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[
            styles.controlChip,
            reduceTransparency && styles.solidControl,
          ]}
          activeOpacity={0.8}
          onPress={onToggleLayout}
        >
          <MaterialIcons
            name="picture-in-picture-alt"
            color="rgba(255,255,255,0.86)"
            size={17}
          />
          <Text style={styles.chipText}>{layoutLabel}</Text>
        </TouchableOpacity>
        {recording && (
          <Text style={styles.timer}>{formatDuration(recordingSeconds)}</Text>
        )}
      </View>
      <View style={styles.shutterRow}>
        <TouchableOpacity
          style={[styles.sideButton, reduceTransparency && styles.solidControl]}
          activeOpacity={0.8}
          onPress={onOpenGallery}
        >
          <MaterialIcons
            name="photo-library"
            color="rgba(255,255,255,0.9)"
            size={26}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideButton, reduceTransparency && styles.solidControl]}
          activeOpacity={0.8}
          onPress={onFlipPrimaryCamera}
        >
          <MaterialIcons
            name="flip-camera-ios"
            color="rgba(255,255,255,0.9)"
            size={27}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.shutterOuter,
            { transform: [{ scale: shutterScale }] },
          ]}
          activeOpacity={0.85}
          disabled={captureBusy || recordingBusy}
          onPress={onPressShutter}
        >
          <View
            style={[
              styles.shutterInner,
              mode === 'video' && styles.shutterVideoIdle,
              recording && styles.shutterRecording,
              (captureBusy || recordingBusy) && styles.shutterBusy,
            ]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideButton, reduceTransparency && styles.solidControl]}
          activeOpacity={0.8}
          onPress={mode === 'video' ? onSetPhotoMode : onSetVideoMode}
        >
          <MaterialIcons
            name={mode === 'video' ? 'photo-camera' : 'videocam'}
            color="rgba(255,255,255,0.9)"
            size={29}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideButton, reduceTransparency && styles.solidControl]}
          activeOpacity={0.8}
          onPress={onToggleQuickPanel}
        >
          <MaterialIcons
            name="more-horiz"
            color="rgba(255,255,255,0.9)"
            size={27}
          />
        </TouchableOpacity>
      </View>
    </View>
  </SafeAreaView>
)

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(
    2,
    '0',
  )}`
}

const styles = StyleSheet.create({
  bottomSafe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomArea: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  modeTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  controlRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  controlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 19,
    backgroundColor: 'rgba(23,24,27,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '400',
  },
  timer: { color: '#ff4757', fontSize: 13, fontWeight: '400' },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,24,27,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  solidControl: {
    backgroundColor: '#17181b',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8e8ea',
  },
  shutterVideoIdle: {
    backgroundColor: '#ff4757',
  },
  shutterRecording: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ff4757',
  },
  shutterBusy: {
    opacity: 0.58,
  },
})
