import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

export const GlassPanel = ({
  children,
  style,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) => <View style={[styles.glassPanel, style]}>{children}</View>

export const MenuItem = ({
  icon,
  label,
  onPress,
}: {
  icon: string
  label: string
  onPress?: () => void
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.75}
    onPress={onPress}
  >
    <Text style={styles.menuIcon}>{icon}</Text>
    <Text style={styles.menuLabel}>{label}</Text>
    <Text style={styles.menuArrow}>›</Text>
  </TouchableOpacity>
)

export const ToggleRow = ({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.75}
    onPress={() => onValueChange(!value)}
  >
    <Text style={styles.menuIcon}>{value ? '●' : '○'}</Text>
    <Text style={styles.menuLabel}>{label}</Text>
    <View style={[styles.switchTrack, value && styles.switchTrackActive]}>
      <View style={[styles.switchKnob, value && styles.switchKnobActive]} />
    </View>
  </TouchableOpacity>
)

export const SettingLine = ({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress?: () => void
}) => {
  const Container = onPress ? TouchableOpacity : View

  return (
    <Container
      style={styles.settingLine}
      activeOpacity={onPress ? 0.78 : undefined}
      onPress={onPress}
    >
      <Text style={styles.settingLineLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </Container>
  )
}

export const ModeButton = ({
  active,
  label,
  onPress,
}: {
  active: boolean
  label: string
  onPress: () => void
}) => (
  <TouchableOpacity
    style={[styles.modeButton, active && styles.modeButtonActive]}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <Text style={[styles.modeText, active && styles.modeTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  glassPanel: {
    position: 'absolute',
    borderRadius: 22,
    padding: 12,
    backgroundColor: 'rgba(22,24,27,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  menuItem: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 24,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 20,
    textAlign: 'center',
  },
  menuLabel: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '400' },
  menuArrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 24,
    fontWeight: '400',
  },
  switchTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: 2,
  },
  switchTrackActive: { backgroundColor: '#00d4ff' },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  switchKnobActive: { transform: [{ translateX: 16 }] },
  settingLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 38,
    borderRadius: 12,
  },
  settingLineLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '400',
  },
  settingValue: { color: '#58e8ff', fontSize: 12, fontWeight: '400' },
  modeButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modeButtonActive: { backgroundColor: 'rgba(255,255,255,0.17)' },
  modeText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 13,
    fontWeight: '400',
  },
  modeTextActive: { color: '#fff' },
})
