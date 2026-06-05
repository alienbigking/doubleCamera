import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { GlassPanel } from '../controls'
import type { LensOption } from './types'

// 焦段下拉组件：展示当前机型实际可用的后置镜头焦段。
export const LensPickerPanel = ({
  top,
  lensOptions,
  selectedLensId,
  onSelectLens,
}: {
  top: number
  lensOptions: LensOption[]
  selectedLensId: string
  onSelectLens: (option: LensOption) => void
}) => (
  <GlassPanel style={[styles.zoomPanel, { top }]}>
    {lensOptions.map(item => (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.zoomItem,
          selectedLensId === item.id && styles.zoomItemActive,
        ]}
        onPress={() => onSelectLens(item)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.zoomText,
            selectedLensId === item.id && styles.zoomTextActive,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    ))}
  </GlassPanel>
)

const styles = StyleSheet.create({
  zoomPanel: {
    left: 18,
    width: 156,
    gap: 6,
  },
  zoomItem: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  zoomItemActive: {
    backgroundColor: 'rgba(0,212,255,0.18)',
    borderColor: 'rgba(0,212,255,0.36)',
  },
  zoomText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 13,
    fontWeight: '400',
  },
  zoomTextActive: { color: '#58e8ff' },
})
