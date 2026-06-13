import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
  formatFocusPercent,
  formatShutterDuration,
} from './professionalModeUtils'

// 专业模式状态条：在主界面上简要显示当前手动参数，避免状态丢失。
export const ProfessionalStatusStrip = ({
  bottom,
  horizontalInset,
  iso,
  shutterDuration,
  focusPosition,
  onPressPro,
  onPressISO,
  onPressShutter,
  onPressFocus,
}: {
  bottom: number
  horizontalInset: number
  iso: number
  shutterDuration: number
  focusPosition: number
  onPressPro: () => void
  onPressISO: () => void
  onPressShutter: () => void
  onPressFocus: () => void
}) => (
  <View style={[styles.strip, { bottom, paddingHorizontal: horizontalInset }]}>
    <View style={styles.slot}>
      <StatusChip label="PRO" accent onPress={onPressPro} />
    </View>
    <View style={styles.slot}>
      <StatusChip label={`ISO ${Math.round(iso)}`} onPress={onPressISO} />
    </View>
    <View style={styles.slot}>
      <StatusChip
        label={`S ${formatShutterDuration(shutterDuration)}`}
        onPress={onPressShutter}
      />
    </View>
    <View style={styles.slot}>
      <StatusChip
        label={`MF ${formatFocusPercent(focusPosition)}`}
        onPress={onPressFocus}
      />
    </View>
  </View>
)

const StatusChip = ({
  label,
  accent,
  onPress,
}: {
  label: string
  accent?: boolean
  onPress: () => void
}) => (
  <TouchableOpacity
    style={[styles.chip, accent && styles.chipAccent]}
    activeOpacity={0.82}
    onPress={onPress}
  >
    <Text style={[styles.chipText, accent && styles.chipTextAccent]}>
      {label}
    </Text>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slot: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chip: {
    height: 34,
    width: '100%',
    paddingHorizontal: 12,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,22,26,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipAccent: {
    backgroundColor: 'rgba(88,232,255,0.18)',
    borderColor: 'rgba(88,232,255,0.34)',
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
  },
  chipTextAccent: {
    color: '#9ff3ff',
  },
})
