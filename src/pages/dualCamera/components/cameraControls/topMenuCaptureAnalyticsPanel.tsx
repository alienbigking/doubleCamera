import React from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import type { CaptureAnalyticsStats } from '../captureAnalytics'
import { TopMenuPanelShell } from './topMenuPanelShell'

const formatDuration = (milliseconds: number, count: number) => {
  if (count <= 0) return '-'

  const seconds = milliseconds / count / 1000
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`
}

const getTopEntry = (values: Record<string, number>, fallback = '-') => {
  const [entry] = Object.entries(values).sort((a, b) => b[1] - a[1])
  if (!entry || entry[1] <= 0) return fallback
  return entry[0]
}

const formatPhotoSaveMode = (mode: string) => {
  if (mode === 'combined') return '合成一张'
  if (mode === 'separate') return '分别保存'
  if (mode === 'combinedAndSeparate') return '同时保存'
  return mode
}

const formatFilter = (filterId: string) => {
  if (filterId === 'none') return '原图'
  if (filterId === 'mono') return '黑白'
  if (filterId === 'quality:standard') return '质量：标准'
  if (
    filterId === 'quality:4k' ||
    filterId === 'quality:high' ||
    filterId === 'quality:original'
  )
    return '质量：4K'
  return filterId
}

const formatStabilization = (mode: string) => {
  if (mode === 'off') return '关闭'
  if (mode === 'standard') return '标准'
  if (mode === 'cinematic') return '电影'
  return mode
}

// 拍摄数据分析面板：展示本机聚合统计，不读取照片内容，也不上传数据。
export const TopMenuCaptureAnalyticsPanel = ({
  top,
  stats,
  enabled,
  onToggleEnabled,
  onReset,
  onBack,
  onClose,
}: {
  top: number
  stats: CaptureAnalyticsStats
  enabled: boolean
  onToggleEnabled: (value: boolean) => void
  onReset: () => void
  onBack: () => void
  onClose: () => void
}) => {
  const totalCaptures = stats.photoCount + stats.videoCount
  const topPhotoSaveMode = formatPhotoSaveMode(
    getTopEntry(stats.photoSaveModeUsage),
  )
  const topFilter = formatFilter(getTopEntry(stats.filterUsage))
  const topStabilization = formatStabilization(
    getTopEntry(stats.stabilizationUsage),
  )

  return (
    <TopMenuPanelShell
      top={top}
      title="拍摄统计"
      icon={
        <MaterialIcons
          name="analytics"
          color="rgba(255,255,255,0.9)"
          size={22}
        />
      }
      onBack={onBack}
      onClose={onClose}
      style={styles.panel}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryGrid}>
          <MetricCard label="总拍摄" value={String(totalCaptures)} />
          <MetricCard label="照片" value={String(stats.photoCount)} />
          <MetricCard label="双摄照片" value={String(stats.dualPhotoCount)} />
          <MetricCard label="视频" value={String(stats.videoCount)} />
        </View>

        <View style={styles.section}>
          <StatLine label="常用保存" value={topPhotoSaveMode} />
          <StatLine label="常用滤镜" value={topFilter} />
          <StatLine label="防抖偏好" value={topStabilization} />
          <StatLine
            label="平均照片保存"
            value={formatDuration(
              stats.totalPhotoSaveDurationMs,
              stats.photoCount,
            )}
          />
          <StatLine
            label="平均视频保存"
            value={formatDuration(
              stats.totalVideoSaveDurationMs,
              stats.videoCount,
            )}
          />
        </View>

        <View style={styles.section}>
          <StatLine
            label="合成+分别保存"
            value={String(stats.combinedAndSeparatePhotoCount)}
          />
          <StatLine
            label="滤镜照片"
            value={String(stats.realtimeFilteredPhotoCount)}
          />
          <StatLine
            label="保存权限失败"
            value={String(stats.savePermissionDeniedCount)}
          />
          <StatLine label="拍照失败" value={String(stats.failedPhotoCount)} />
          <StatLine label="录像失败" value={String(stats.failedVideoCount)} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, enabled && styles.actionButtonActive]}
            activeOpacity={0.8}
            onPress={() => onToggleEnabled(!enabled)}
          >
            <MaterialIcons
              name={enabled ? 'bar-chart' : 'bar-chart'}
              color={enabled ? '#071114' : 'rgba(255,255,255,0.86)'}
              size={18}
            />
            <Text
              style={[styles.actionText, enabled && styles.actionTextActive]}
            >
              {enabled ? '统计已开启' : '统计已关闭'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={onReset}
          >
            <MaterialIcons
              name="delete-outline"
              color="rgba(255,255,255,0.86)"
              size={18}
            />
            <Text style={styles.actionText}>清空统计</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TopMenuPanelShell>
  )
}

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
)

const StatLine = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statLine}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
)

const styles = StyleSheet.create({
  panel: {
    width: 312,
    maxHeight: 560,
    overflow: 'hidden',
  },
  scroll: {
    maxHeight: 478,
    minHeight: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '48%',
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(88,232,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(88,232,255,0.16)',
    justifyContent: 'space-between',
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '400',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 12,
    fontWeight: '400',
  },
  section: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLine: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
    fontWeight: '400',
  },
  statValue: {
    color: '#fff',
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonActive: {
    backgroundColor: '#58e8ff',
    borderColor: '#58e8ff',
  },
  actionText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    fontWeight: '400',
  },
  actionTextActive: {
    color: '#071114',
  },
})
