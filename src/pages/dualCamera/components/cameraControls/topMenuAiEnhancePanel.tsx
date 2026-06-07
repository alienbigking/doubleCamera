import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { TopMenuPanelShell } from './topMenuPanelShell'

// AI 增强面板：保留为独立模块，后续在这里接真实增强能力而不是散落在菜单项里。
export const TopMenuAiEnhancePanel = ({
  top,
  onBack,
  onClose,
}: {
  top: number
  onBack: () => void
  onClose: () => void
}) => (
  <TopMenuPanelShell
    top={top}
    title="AI增强"
    icon={
      <MaterialIcons
        name="auto-awesome"
        color="rgba(255,255,255,0.9)"
        size={22}
      />
    }
    onBack={onBack}
    onClose={onClose}
    style={styles.panel}
  >
    <View style={styles.noteBox}>
      <Text style={styles.noteTitle}>模块已拆分</Text>
      <Text style={styles.noteText}>
        这里后续接场景识别、降噪增强和成像优化，当前先保留独立能力面板，避免把逻辑耦合回主界面。
      </Text>
    </View>
  </TopMenuPanelShell>
)

const styles = StyleSheet.create({
  panel: {
    width: 264,
  },
  noteBox: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  noteTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 6,
  },
  noteText: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
})
