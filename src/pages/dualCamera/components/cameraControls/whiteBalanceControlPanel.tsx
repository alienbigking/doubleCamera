import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import type { WhiteBalancePreset } from './types'

export type WhiteBalanceOption = {
  id: WhiteBalancePreset
  label: string
  temperature?: number
  tint?: number
}

export const whiteBalanceOptions: WhiteBalanceOption[] = [
  { id: 'auto', label: '自动' },
  { id: 'cool', label: '冷色', temperature: 4200, tint: 0 },
  { id: 'natural', label: '自然', temperature: 5500, tint: 0 },
  { id: 'warm', label: '暖色', temperature: 7000, tint: 0 },
]

const getWhiteBalanceLabel = (preset: WhiteBalancePreset) =>
  whiteBalanceOptions.find(option => option.id === preset)?.label || '自动'

// 白平衡控制弹框组件：分别调整后置和前置摄像头的色温预设。
export const WhiteBalanceControlPanel = ({
  primaryLabel,
  secondaryLabel,
  rearPreset,
  frontPreset,
  rearSupported,
  frontSupported,
  onChangeRearPreset,
  onChangeFrontPreset,
  onClose,
}: {
  primaryLabel: string
  secondaryLabel: string
  rearPreset: WhiteBalancePreset
  frontPreset: WhiteBalancePreset
  rearSupported: boolean
  frontSupported: boolean
  onChangeRearPreset: (preset: WhiteBalancePreset) => void
  onChangeFrontPreset: (preset: WhiteBalancePreset) => void
  onClose: () => void
}) => {
  const [openSide, setOpenSide] = useState<'rear' | 'front' | null>(null)

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <MaterialIcons
            name="filter-vintage"
            color="rgba(255,255,255,0.9)"
            size={28}
          />
          <Text style={styles.title}>白平衡</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.75}
          onPress={onClose}
        >
          <MaterialIcons
            name="close"
            color="rgba(255,255,255,0.92)"
            size={28}
          />
        </TouchableOpacity>
      </View>
      <WhiteBalanceRow
        label={primaryLabel}
        preset={rearPreset}
        supported={rearSupported}
        open={openSide === 'rear'}
        onToggleOpen={() => setOpenSide(openSide === 'rear' ? null : 'rear')}
        onSelect={preset => {
          onChangeRearPreset(preset)
          setOpenSide(null)
        }}
      />
      <WhiteBalanceRow
        label={secondaryLabel}
        preset={frontPreset}
        supported={frontSupported}
        open={openSide === 'front'}
        onToggleOpen={() => setOpenSide(openSide === 'front' ? null : 'front')}
        onSelect={preset => {
          onChangeFrontPreset(preset)
          setOpenSide(null)
        }}
      />
    </View>
  )
}

const WhiteBalanceRow = ({
  label,
  preset,
  supported,
  open,
  onToggleOpen,
  onSelect,
}: {
  label: string
  preset: WhiteBalancePreset
  supported: boolean
  open: boolean
  onToggleOpen: () => void
  onSelect: (preset: WhiteBalancePreset) => void
}) => (
  <View
    style={[
      styles.row,
      open && styles.rowOpen,
      !supported && styles.rowDisabled,
    ]}
  >
    <Text style={styles.rowLabel}>{label}</Text>
    <TouchableOpacity
      style={styles.selectButton}
      activeOpacity={0.78}
      disabled={!supported}
      onPress={onToggleOpen}
    >
      <Text style={styles.selectText}>{getWhiteBalanceLabel(preset)}</Text>
      <MaterialIcons
        name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
        color="rgba(255,255,255,0.54)"
        size={28}
      />
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.resetButton}
      activeOpacity={0.75}
      disabled={!supported}
      onPress={() => onSelect('auto')}
    >
      <MaterialIcons name="refresh" color="rgba(255,255,255,0.46)" size={29} />
    </TouchableOpacity>
    {open && (
      <View style={styles.dropdown}>
        {whiteBalanceOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={styles.option}
            activeOpacity={0.78}
            onPress={() => onSelect(option.id)}
          >
            <Text style={styles.optionText}>{option.label}</Text>
            {preset === option.id && (
              <MaterialIcons
                name="check"
                color="rgba(255,255,255,0.92)"
                size={30}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
)

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 38,
    right: 38,
    top: '50%',
    transform: [{ translateY: -184 }],
    zIndex: 20,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
    backgroundColor: 'rgba(22,24,29,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  header: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '400',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    zIndex: 1,
    overflow: 'visible',
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowOpen: {
    zIndex: 9,
  },
  rowDisabled: {
    opacity: 0.42,
  },
  rowLabel: {
    width: 92,
    color: '#fff',
    fontSize: 21,
    fontWeight: '400',
  },
  selectButton: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    paddingLeft: 22,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 21,
    fontWeight: '400',
  },
  resetButton: {
    width: 44,
    height: 44,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 58,
    left: 70,
    right: 36,
    zIndex: 8,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: 'rgba(56,56,58,0.98)',
  },
  option: {
    minHeight: 70,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  optionText: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '400',
  },
})
