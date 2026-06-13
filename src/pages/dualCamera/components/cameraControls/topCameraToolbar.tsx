import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import type { FlashMode, LensOption, StabilizationMode } from './types'

const getFlashIconName = (flashMode: FlashMode) => {
  if (flashMode === 'on') return 'flash-on'
  if (flashMode === 'auto') return 'flash-auto'
  return 'flash-off'
}

const getStabilizationIconName = (stabilizationMode: StabilizationMode) => {
  if (stabilizationMode === 'cinematic') return 'movie-filter'
  if (stabilizationMode === 'standard') return 'directions-run'
  return 'directions-walk'
}

// 顶部工具栏组件：承载焦段入口、闪光灯、防抖和更多菜单入口。
export const TopCameraToolbar = ({
  top,
  horizontalInset,
  expanded,
  selectedLens,
  flashMode,
  flashAvailable,
  flashIndicatorVisible,
  captureMode,
  stabilizationMode,
  stabilizationAvailable,
  reduceTransparency,
  onToggleLensPanel,
  onToggleFlashMode,
  onToggleStabilizationMode,
  onToggleMenu,
}: {
  top: number
  horizontalInset: number
  expanded: boolean
  selectedLens: LensOption
  flashMode: FlashMode
  flashAvailable: boolean
  flashIndicatorVisible: boolean
  captureMode: 'photo' | 'video'
  stabilizationMode: StabilizationMode
  stabilizationAvailable: boolean
  reduceTransparency: boolean
  onToggleLensPanel: () => void
  onToggleFlashMode: () => void
  onToggleStabilizationMode: () => void
  onToggleMenu: () => void
}) => (
  <View style={[styles.topTools, { top, paddingHorizontal: horizontalInset }]}>
    {expanded ? (
      <>
        <TouchableOpacity
          style={[styles.lensPill, reduceTransparency && styles.solidControl]}
          activeOpacity={0.8}
          onPress={onToggleLensPanel}
        >
          <Text style={styles.lensText}>{selectedLens.label}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <View
          style={[
            styles.featureGroup,
            reduceTransparency && styles.solidControl,
          ]}
        >
          {flashIndicatorVisible && (
            <>
              <TouchableOpacity
                style={[
                  styles.featureIconButton,
                  !flashAvailable && styles.featureIconButtonDisabled,
                ]}
                activeOpacity={0.8}
                disabled={!flashAvailable}
                onPress={onToggleFlashMode}
              >
                <MaterialIcons
                  name={getFlashIconName(flashMode)}
                  color={
                    flashAvailable
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.32)'
                  }
                  size={24}
                />
              </TouchableOpacity>
              <View style={styles.featureDivider} />
            </>
          )}
          <TouchableOpacity
            style={[
              styles.featureIconButton,
              !stabilizationAvailable && styles.featureIconButtonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={!stabilizationAvailable}
            onPress={onToggleStabilizationMode}
          >
            <MaterialIcons
              name={getStabilizationIconName(stabilizationMode)}
              color={
                !stabilizationAvailable
                  ? 'rgba(255,255,255,0.32)'
                  : captureMode === 'photo' || stabilizationMode === 'off'
                  ? 'rgba(255,255,255,0.9)'
                  : '#58e8ff'
              }
              size={24}
            />
          </TouchableOpacity>
        </View>
      </>
    ) : (
      <View />
    )}
    <TouchableOpacity
      style={[styles.glassCircle, reduceTransparency && styles.solidControl]}
      activeOpacity={0.8}
      onPress={onToggleMenu}
    >
      <MaterialIcons name="apps" color="rgba(255,255,255,0.9)" size={25} />
    </TouchableOpacity>
  </View>
)

const styles = StyleSheet.create({
  topTools: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,24,27,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  lensPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 138,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(23,24,27,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  lensText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
  chevron: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '400',
  },
  featureGroup: {
    height: 44,
    minWidth: 104,
    borderRadius: 22,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,24,27,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  solidControl: {
    backgroundColor: '#17181b',
  },
  featureIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconButtonDisabled: {
    opacity: 0.58,
  },
  featureDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
})
