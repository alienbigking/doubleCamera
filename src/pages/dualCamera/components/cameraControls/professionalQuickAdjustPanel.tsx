import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Slider from '@react-native-community/slider'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { GlassPanel } from '../controls'
import {
  formatFocusPercent,
  formatShutterDuration,
} from './professionalModeUtils'

type QuickAdjustMode = 'iso' | 'shutter' | 'focus'

// 专业模式快捷调节面板：承载底部状态条对应的快速参数调整。
export const ProfessionalQuickAdjustPanel = ({
  bottom,
  mode,
  iso,
  minISO,
  maxISO,
  shutterDuration,
  minShutterDuration,
  maxShutterDuration,
  shutterOptions,
  focusPosition,
  onPreviewISO,
  onCommitISO,
  onPreviewShutter,
  onCommitShutter,
  onSelectShutter,
  onPreviewFocus,
  onCommitFocus,
}: {
  bottom: number
  mode: QuickAdjustMode
  iso: number
  minISO: number
  maxISO: number
  shutterDuration: number
  minShutterDuration: number
  maxShutterDuration: number
  shutterOptions: number[]
  focusPosition: number
  onPreviewISO: (value: number) => void
  onCommitISO: (value: number) => void
  onPreviewShutter: (value: number) => void
  onCommitShutter: (value: number) => void
  onSelectShutter: (value: number) => void
  onPreviewFocus: (value: number) => void
  onCommitFocus: (value: number) => void
}) => {
  const shutterSliderValue = getShutterSliderValue(
    shutterDuration,
    minShutterDuration,
    maxShutterDuration,
  )
  const activeShutterOption = shutterOptions.find(
    option =>
      Math.abs(option - shutterDuration) <= Math.max(option * 0.06, 1 / 1500),
  )

  return (
    <GlassPanel style={[styles.panel, { bottom }]}>
      {mode === 'iso' ? (
        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.title}>ISO</Text>
            <Text style={styles.value}>{Math.round(iso)}</Text>
          </View>
          <Slider
            style={styles.slider}
            value={iso}
            minimumValue={minISO}
            maximumValue={maxISO}
            step={1}
            minimumTrackTintColor="#58e8ff"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#fff"
            onValueChange={onPreviewISO}
            onSlidingComplete={onCommitISO}
          />
        </View>
      ) : null}

      {mode === 'shutter' ? (
        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.title}>快门</Text>
            <Text style={styles.value}>
              {formatShutterDuration(shutterDuration)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            value={shutterSliderValue}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor="#58e8ff"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#fff"
            onValueChange={value =>
              onPreviewShutter(
                getShutterDurationFromSlider(
                  value,
                  minShutterDuration,
                  maxShutterDuration,
                ),
              )
            }
            onSlidingComplete={value =>
              onCommitShutter(
                getShutterDurationFromSlider(
                  value,
                  minShutterDuration,
                  maxShutterDuration,
                ),
              )
            }
          />
          <View style={styles.chipWrap}>
            {shutterOptions.map(option => {
              const active = activeShutterOption === option
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.82}
                  onPress={() => onSelectShutter(option)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {formatShutterDuration(option)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      ) : null}

      {mode === 'focus' ? (
        <View style={styles.section}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <MaterialIcons
                name="center-focus-strong"
                color="rgba(255,255,255,0.9)"
                size={18}
              />
              <Text style={styles.title}>手动对焦</Text>
            </View>
            <Text style={styles.value}>
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
            minimumTrackTintColor="#58e8ff"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#fff"
            onValueChange={onPreviewFocus}
            onSlidingComplete={onCommitFocus}
          />
        </View>
      ) : null}
    </GlassPanel>
  )
}

const getShutterSliderValue = (
  duration: number,
  minDuration: number,
  maxDuration: number,
) => {
  const safeMin = Math.max(minDuration, 0.0001)
  const safeMax = Math.max(maxDuration, safeMin)
  const safeDuration = Math.min(Math.max(duration, safeMin), safeMax)

  if (Math.abs(safeMax - safeMin) < 0.000001) return 0

  return (
    (Math.log(safeDuration) - Math.log(safeMin)) /
    (Math.log(safeMax) - Math.log(safeMin))
  )
}

const getShutterDurationFromSlider = (
  value: number,
  minDuration: number,
  maxDuration: number,
) => {
  const safeMin = Math.max(minDuration, 0.0001)
  const safeMax = Math.max(maxDuration, safeMin)
  const clampedValue = Math.min(Math.max(value, 0), 1)

  if (Math.abs(safeMax - safeMin) < 0.000001) return safeMin

  return Math.exp(
    Math.log(safeMin) + (Math.log(safeMax) - Math.log(safeMin)) * clampedValue,
  )
}

const styles = StyleSheet.create({
  panel: {
    left: 16,
    right: 16,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  section: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
  },
  value: {
    color: '#58e8ff',
    fontSize: 13,
    fontWeight: '400',
  },
  slider: {
    width: '100%',
    height: 32,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minWidth: 56,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(88,232,255,0.22)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.66)',
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
})
