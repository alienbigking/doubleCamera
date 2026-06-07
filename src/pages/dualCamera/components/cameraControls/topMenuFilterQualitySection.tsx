import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
  dualCameraFilterRenderQualityPresets,
  type DualCameraFilterRenderQuality,
} from '../filters'

// 滤镜成片质量设置组件：控制滤镜照片导出的质量档位。
export const TopMenuFilterQualitySection = ({
  selectedQuality,
  onSelectQuality,
}: {
  selectedQuality: DualCameraFilterRenderQuality
  onSelectQuality: (quality: DualCameraFilterRenderQuality) => void
}) => (
  <View style={styles.section}>
    <Text style={styles.settingLabel}>成片质量</Text>
    <View style={styles.qualityButtons}>
      {dualCameraFilterRenderQualityPresets.map(item => {
        const active = item.id === selectedQuality
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.qualityButton, active && styles.qualityButtonActive]}
            activeOpacity={0.82}
            onPress={() => onSelectQuality(item.id)}
          >
            <Text
              style={[styles.qualityLabel, active && styles.qualityLabelActive]}
            >
              {item.label}
            </Text>
            <Text style={styles.qualityDescription}>{item.description}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  </View>
)

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
  },
  settingLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 8,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },
  qualityButtonActive: {
    backgroundColor: 'rgba(88,232,255,0.12)',
    borderColor: 'rgba(88,232,255,0.34)',
  },
  qualityLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  qualityLabelActive: {
    color: '#9ff3ff',
  },
  qualityDescription: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
})
