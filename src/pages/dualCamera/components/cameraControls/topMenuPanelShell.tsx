import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { GlassPanel } from '../controls'

// 顶部菜单子面板通用容器：统一标题栏、返回、关闭和玻璃面板样式。
export const TopMenuPanelShell = ({
  top,
  title,
  icon,
  children,
  onBack,
  onClose,
  style,
}: {
  top: number
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  onBack?: () => void
  onClose: () => void
  style?: StyleProp<ViewStyle>
}) => (
  <GlassPanel style={[styles.panel, { top }, style]}>
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.76}
            onPress={onBack}
          >
            <MaterialIcons
              name="arrow-back-ios-new"
              color="rgba(255,255,255,0.86)"
              size={18}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <View style={styles.titleGroup}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.headerButton}
        activeOpacity={0.76}
        onPress={onClose}
      >
        <MaterialIcons name="close" color="rgba(255,255,255,0.92)" size={24} />
      </TouchableOpacity>
    </View>
    <View style={styles.content}>{children}</View>
  </GlassPanel>
)

const styles = StyleSheet.create({
  panel: {
    right: 18,
    width: 268,
    paddingTop: 10,
  },
  header: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 4,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '400',
  },
  content: {
    gap: 6,
    minHeight: 0,
    flexShrink: 1,
  },
})
