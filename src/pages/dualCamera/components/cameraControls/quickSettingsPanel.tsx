import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { GlassPanel, SettingLine } from '../controls'
import type {
  CaptureTimerMode,
  PhotoSaveMode,
  WhiteBalancePreset,
} from './types'
import { whiteBalanceOptions } from './whiteBalanceControlPanel'

const formatExposure = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(1)}`
const formatWhiteBalance = (preset: WhiteBalancePreset) =>
  whiteBalanceOptions.find(option => option.id === preset)?.label || '自动'

// 快捷设置弹层组件：承载宽高比、照片保存方式等拍摄快捷配置。
export const QuickSettingsPanel = ({
  ratios,
  ratio,
  captureTimerMode,
  photoSaveMode,
  focusLocked,
  rearExposure,
  frontExposure,
  rearWhiteBalancePreset,
  frontWhiteBalancePreset,
  onChangeRatio,
  onToggleCaptureTimer,
  onChangePhotoSaveMode,
  onToggleFocusLock,
  onOpenExposurePanel,
  onOpenWhiteBalancePanel,
}: {
  ratios: string[]
  ratio: string
  captureTimerMode: CaptureTimerMode
  photoSaveMode: PhotoSaveMode
  focusLocked: boolean
  rearExposure: number
  frontExposure: number
  rearWhiteBalancePreset: WhiteBalancePreset
  frontWhiteBalancePreset: WhiteBalancePreset
  onChangeRatio: (ratio: string) => void
  onToggleCaptureTimer: () => void
  onChangePhotoSaveMode: (mode: PhotoSaveMode) => void
  onToggleFocusLock: () => void
  onOpenExposurePanel: () => void
  onOpenWhiteBalancePanel: () => void
}) => (
  <GlassPanel style={styles.quickPanel}>
    <Text style={styles.panelTitle}>快捷设置</Text>
    <Text style={styles.settingLabel}>宽高比</Text>
    <View style={styles.ratioGroup}>
      {ratios.map(item => (
        <TouchableOpacity
          key={item}
          style={[styles.ratioItem, ratio === item && styles.ratioItemActive]}
          onPress={() => onChangeRatio(item)}
        >
          <Text
            style={[styles.ratioText, ratio === item && styles.ratioTextActive]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    <SettingLine
      label="拍摄倒计时"
      value={captureTimerMode === 'off' ? '关闭' : captureTimerMode}
      onPress={onToggleCaptureTimer}
    />
    <View style={styles.saveModeGroup}>
      <Text style={styles.settingLabel}>照片保存</Text>
      <View style={styles.saveModeButtons}>
        <TouchableOpacity
          style={[
            styles.saveModeButton,
            photoSaveMode === 'combined' && styles.saveModeButtonActive,
          ]}
          activeOpacity={0.8}
          onPress={() => onChangePhotoSaveMode('combined')}
        >
          <Text
            style={[
              styles.saveModeText,
              photoSaveMode === 'combined' && styles.saveModeTextActive,
            ]}
          >
            合成一张
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.saveModeButton,
            photoSaveMode === 'separate' && styles.saveModeButtonActive,
          ]}
          activeOpacity={0.8}
          onPress={() => onChangePhotoSaveMode('separate')}
        >
          <Text
            style={[
              styles.saveModeText,
              photoSaveMode === 'separate' && styles.saveModeTextActive,
            ]}
          >
            分别保存
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.saveModeButton,
            photoSaveMode === 'combinedAndSeparate' &&
              styles.saveModeButtonActive,
          ]}
          activeOpacity={0.8}
          onPress={() => onChangePhotoSaveMode('combinedAndSeparate')}
        >
          <Text
            style={[
              styles.saveModeText,
              photoSaveMode === 'combinedAndSeparate' &&
                styles.saveModeTextActive,
            ]}
          >
            合成+分别
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    <SettingLine
      label="对焦锁定"
      value={focusLocked ? '已锁定' : '未锁定'}
      onPress={onToggleFocusLock}
    />
    <SettingLine
      label="曝光"
      value={`后 ${formatExposure(rearExposure)} / 前 ${formatExposure(
        frontExposure,
      )}`}
      onPress={onOpenExposurePanel}
    />
    <SettingLine
      label="白平衡"
      value={`后 ${formatWhiteBalance(
        rearWhiteBalancePreset,
      )} / 前 ${formatWhiteBalance(frontWhiteBalancePreset)}`}
      onPress={onOpenWhiteBalancePanel}
    />
  </GlassPanel>
)

const styles = StyleSheet.create({
  quickPanel: { right: 18, bottom: 128, width: 260 },
  panelTitle: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  settingLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 8,
  },
  ratioGroup: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  ratioItem: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  ratioItemActive: {
    backgroundColor: 'rgba(0,212,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.35)',
  },
  ratioText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '400',
  },
  ratioTextActive: { color: '#58e8ff' },
  saveModeGroup: { marginBottom: 8 },
  saveModeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  saveModeButton: {
    minWidth: 76,
    flexGrow: 1,
    minHeight: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveModeButtonActive: {
    backgroundColor: 'rgba(0,212,255,0.18)',
    borderColor: 'rgba(0,212,255,0.35)',
  },
  saveModeText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '400',
  },
  saveModeTextActive: { color: '#58e8ff' },
})
