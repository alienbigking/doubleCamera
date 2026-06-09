import React from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { ModeButton } from '../controls'
import {
  formatFocusPercent,
  formatShutterDuration,
} from './professionalModeUtils'
import { TopMenuPanelShell } from './topMenuPanelShell'
import {
  formatToneAdjustmentValue,
  professionalToneAdjustmentItems,
  type ProfessionalToneAdjustmentKey,
  type ProfessionalToneAdjustments,
} from '../filters'

// 专业模式面板：承载后摄像头的手动曝光与手动对焦控制。
export const TopMenuProfessionalPanel = ({
  top,
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
  const supportsProfessionalControl = exposureSupported || focusSupported

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
        <Text style={styles.modeLabel}>后摄手动控制</Text>
        <View style={styles.modeButtons}>
          <ModeButton
            active={enabled}
            label="开启"
            onPress={() => onToggleEnabled(true)}
          />
          <ModeButton
            active={!enabled}
            label="关闭"
            onPress={() => onToggleEnabled(false)}
          />
        </View>
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
                disabled={!enabled || !exposureSupported}
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
                      disabled={!enabled || !exposureSupported}
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
                disabled={!enabled || !focusSupported}
                minimumTrackTintColor="#58e8ff"
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor="#fff"
                onValueChange={onPreviewFocusPosition}
                onSlidingComplete={onCommitFocusPosition}
              />
            </View>
          </>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>实时调色</Text>
            <TouchableOpacity
              activeOpacity={0.78}
              style={styles.resetButton}
              onPress={onResetToneAdjustments}
            >
              <Text style={styles.resetButtonText}>重置</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.toneList}>
            {professionalToneAdjustmentItems.map(item => (
              <View key={item.key} style={styles.toneItem}>
                <View style={styles.toneHeader}>
                  <Text style={styles.toneLabel}>{item.label}</Text>
                  <Text style={styles.sectionValue}>
                    {formatToneAdjustmentValue(toneAdjustments[item.key])}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  value={toneAdjustments[item.key]}
                  minimumValue={-100}
                  maximumValue={100}
                  step={1}
                  minimumTrackTintColor="#58e8ff"
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor="#fff"
                  onValueChange={value =>
                    onChangeToneAdjustment(item.key, value)
                  }
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
  modeLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 10,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
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
