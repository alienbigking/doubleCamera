import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import {
  formatFocusPercent,
  formatShutterDuration,
} from './professionalModeUtils'
import { TopMenuPanelShell } from './topMenuPanelShell'
import type { CaptureMode } from './types'
import {
  formatToneAdjustmentValue,
  professionalToneAdjustmentItems,
  type ProfessionalToneAdjustmentKey,
  type ProfessionalToneAdjustments,
} from '../filters'

// 专业模式面板：承载后摄像头的手动曝光与手动对焦控制。
export const TopMenuProfessionalPanel = ({
  top,
  captureMode,
  enabled,
  exposureSupported,
  focusSupported,
  iso,
  minISO,
  maxISO,
  shutterDuration,
  shutterOptions,
  focusPosition,
  toneAdjustments,
  onToggleEnabled,
  onPreviewISO,
  onCommitISO,
  onSelectShutter,
  onPreviewFocusPosition,
  onCommitFocusPosition,
  onChangeToneAdjustment,
  onResetToneAdjustments,
  onBack,
  onClose,
}: {
  top: number
  captureMode: CaptureMode
  enabled: boolean
  exposureSupported: boolean
  focusSupported: boolean
  iso: number
  minISO: number
  maxISO: number
  shutterDuration: number
  shutterOptions: number[]
  focusPosition: number
  toneAdjustments: ProfessionalToneAdjustments
  onToggleEnabled: (value: boolean) => void
  onPreviewISO: (value: number) => void
  onCommitISO: (value: number) => void
  onSelectShutter: (value: number) => void
  onPreviewFocusPosition: (value: number) => void
  onCommitFocusPosition: (value: number) => void
  onChangeToneAdjustment: (
    key: ProfessionalToneAdjustmentKey,
    value: number,
  ) => void
  onResetToneAdjustments: () => void
  onBack: () => void
  onClose: () => void
}) => {
  const [localToneAdjustments, setLocalToneAdjustments] =
    useState<ProfessionalToneAdjustments>(toneAdjustments)

  useEffect(() => {
    setLocalToneAdjustments(toneAdjustments)
  }, [toneAdjustments])

  const supportsProfessionalControl = exposureSupported || focusSupported
  const photoModeActive = captureMode === 'photo'
  const controlsEnabled = enabled && photoModeActive

  const handleToneChange = (
    key: ProfessionalToneAdjustmentKey,
    value: number,
  ) => {
    setLocalToneAdjustments(current => ({
      ...current,
      [key]: value,
    }))
    onChangeToneAdjustment(key, value)
  }

  return (
    <TopMenuPanelShell
      top={top}
      title="专业模式"
      icon={
        <MaterialIcons name="tune" color="rgba(255,255,255,0.9)" size={22} />
      }
      onBack={onBack}
      onClose={onClose}
      style={styles.panel}
    >
      <View style={styles.modeRow}>
        <View style={styles.modeHeader}>
          <Text style={styles.modeLabel}>后摄手动控制</Text>
          <TouchableOpacity
            style={[
              styles.switchTrack,
              enabled && styles.switchTrackActive,
              !photoModeActive && styles.switchTrackDisabled,
            ]}
            activeOpacity={0.82}
            disabled={!photoModeActive}
            onPress={() => onToggleEnabled(!enabled)}
          >
            <View
              style={[styles.switchKnob, enabled && styles.switchKnobActive]}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.modeHint}>
          专业模式仅在拍照模式下生效。切换到视频模式后，本面板所有设置都会暂时停用。
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!supportsProfessionalControl ? (
          <View style={styles.unsupportedBox}>
            <MaterialIcons
              name="info-outline"
              color="rgba(255,255,255,0.76)"
              size={18}
            />
            <Text style={styles.unsupportedText}>
              当前设备暂不支持手动相机控制
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.section,
                !exposureSupported && styles.sectionDisabled,
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ISO</Text>
                <Text style={styles.sectionValue}>{Math.round(iso)}</Text>
              </View>
              <Slider
                style={styles.slider}
                value={iso}
                minimumValue={minISO}
                maximumValue={maxISO}
                step={1}
                disabled={!controlsEnabled || !exposureSupported}
                minimumTrackTintColor="#58e8ff"
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor="#fff"
                onValueChange={onPreviewISO}
                onSlidingComplete={onCommitISO}
              />
            </View>

            <View
              style={[
                styles.section,
                !exposureSupported && styles.sectionDisabled,
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>快门</Text>
                <Text style={styles.sectionValue}>
                  {formatShutterDuration(shutterDuration)}
                </Text>
              </View>
              <View style={styles.chipWrap}>
                {shutterOptions.map(option => {
                  const active = Math.abs(option - shutterDuration) < 0.0001
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      activeOpacity={0.82}
                      disabled={!controlsEnabled || !exposureSupported}
                      onPress={() => onSelectShutter(option)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {formatShutterDuration(option)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View
              style={[
                styles.section,
                !focusSupported && styles.sectionDisabled,
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>手动对焦</Text>
                <Text style={styles.sectionValue}>
                  {formatFocusPercent(focusPosition)}
                </Text>
              </View>
              <View style={styles.focusLabels}>
                <Text style={styles.focusHint}>最近</Text>
                <Text style={styles.focusHint}>远处</Text>
              </View>
              <Slider
                style={styles.slider}
                value={focusPosition}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                disabled={!controlsEnabled || !focusSupported}
                minimumTrackTintColor="#58e8ff"
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor="#fff"
                onValueChange={onPreviewFocusPosition}
                onSlidingComplete={onCommitFocusPosition}
              />
            </View>
          </>
        )}

        <View
          style={[styles.section, !controlsEnabled && styles.sectionDisabled]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>实时调色</Text>
            <TouchableOpacity
              activeOpacity={0.78}
              style={styles.resetButton}
              disabled={!controlsEnabled}
              onPress={onResetToneAdjustments}
            >
              <Text
                style={[
                  styles.resetButtonText,
                  !controlsEnabled && styles.resetButtonTextDisabled,
                ]}
              >
                重置
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.toneList}>
            {professionalToneAdjustmentItems.map(item => (
              <View key={item.key} style={styles.toneItem}>
                <View style={styles.toneHeader}>
                  <Text style={styles.toneLabel}>{item.label}</Text>
                  <Text style={styles.sectionValue}>
                    {formatToneAdjustmentValue(localToneAdjustments[item.key])}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  value={localToneAdjustments[item.key]}
                  minimumValue={-100}
                  maximumValue={100}
                  step={1}
                  disabled={!controlsEnabled}
                  minimumTrackTintColor="#58e8ff"
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor="#fff"
                  onValueChange={value => handleToneChange(item.key, value)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </TopMenuPanelShell>
  )
}

const styles = StyleSheet.create({
  panel: {
    width: 296,
    maxHeight: 560,
    overflow: 'hidden',
  },
  modeRow: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modeLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '400',
  },
  modeHint: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.54)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  switchTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#00d4ff',
  },
  switchTrackDisabled: {
    opacity: 0.45,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchKnobActive: {
    transform: [{ translateX: 18 }],
  },
  unsupportedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  unsupportedText: {
    flex: 1,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 13,
    fontWeight: '400',
  },
  scroll: {
    maxHeight: 450,
    minHeight: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  section: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sectionDisabled: {
    opacity: 0.42,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
  },
  sectionValue: {
    color: '#58e8ff',
    fontSize: 13,
    fontWeight: '400',
  },
  slider: {
    width: '100%',
    height: 36,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(88,232,255,0.22)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '400',
  },
  chipTextActive: {
    color: '#fff',
  },
  focusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  focusHint: {
    color: 'rgba(255,255,255,0.44)',
    fontSize: 11,
    fontWeight: '400',
  },
  resetButton: {
    height: 26,
    minWidth: 48,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88,232,255,0.14)',
  },
  resetButtonText: {
    color: '#58e8ff',
    fontSize: 12,
    fontWeight: '400',
  },
  resetButtonTextDisabled: {
    color: 'rgba(255,255,255,0.34)',
  },
  toneList: {
    gap: 8,
  },
  toneItem: {
    gap: 2,
  },
  toneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toneLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '400',
  },
})
