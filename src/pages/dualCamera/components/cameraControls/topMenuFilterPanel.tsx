import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import {
  dualCameraFilterPresets,
  type DualCameraFilterId,
  type DualCameraFilterRenderQuality,
} from '../filters'
import { TopMenuPanelShell } from './topMenuPanelShell'
import { TopMenuFilterQualitySection } from './topMenuFilterQualitySection'

// 滤镜库面板：承载双摄滤镜预设选择。
export const TopMenuFilterPanel = ({
  top,
  selectedFilterId,
  selectedRenderQuality,
  onSelectFilter,
  onSelectRenderQuality,
  onBack,
  onClose,
}: {
  top: number
  selectedFilterId: DualCameraFilterId
  selectedRenderQuality: DualCameraFilterRenderQuality
  onSelectFilter: (filterId: DualCameraFilterId) => void
  onSelectRenderQuality: (quality: DualCameraFilterRenderQuality) => void
  onBack: () => void
  onClose: () => void
}) => (
  <TopMenuPanelShell
    top={top}
    title="滤镜库"
    icon={
      <MaterialIcons name="gradient" color="rgba(255,255,255,0.9)" size={22} />
    }
    onBack={onBack}
    onClose={onClose}
    style={styles.panel}
  >
    <Text style={styles.sectionTitle}>实时预览与照片保存共用同一套滤镜</Text>
    <TopMenuFilterQualitySection
      selectedQuality={selectedRenderQuality}
      onSelectQuality={onSelectRenderQuality}
    />
    <View style={styles.filterList}>
      {dualCameraFilterPresets.map(filter => {
        const active = filter.id === selectedFilterId
        return (
          <TouchableOpacity
            key={filter.id}
            style={[styles.filterItem, active && styles.filterItemActive]}
            activeOpacity={0.82}
            onPress={() => onSelectFilter(filter.id)}
          >
            <View style={styles.filterMain}>
              <Text
                style={[styles.filterLabel, active && styles.filterLabelActive]}
              >
                {filter.label}
              </Text>
              <Text style={styles.filterDescription}>{filter.description}</Text>
            </View>
            {active ? (
              <MaterialIcons name="check" color="#58e8ff" size={20} />
            ) : null}
          </TouchableOpacity>
        )
      })}
    </View>
  </TopMenuPanelShell>
)

const styles = StyleSheet.create({
  panel: {
    width: 276,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 6,
  },
  filterList: {
    gap: 6,
  },
  filterItem: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterItemActive: {
    backgroundColor: 'rgba(88,232,255,0.12)',
    borderColor: 'rgba(88,232,255,0.34)',
  },
  filterMain: {
    flex: 1,
  },
  filterLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 2,
  },
  filterLabelActive: {
    color: '#9ff3ff',
  },
  filterDescription: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 12,
    fontWeight: '400',
  },
})
