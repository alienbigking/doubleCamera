import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassPanel, SettingLine } from '../controls'
import {
  dualCameraFilterRenderQualityPresets,
  type DualCameraFilterRenderQuality,
} from '../filters'
import type {
  CaptureTimerMode,
  PhotoSaveMode,
  WhiteBalancePreset,
} from './types'
import { getWhiteBalanceLabel } from './whiteBalanceControlPanel'

const formatExposure = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(1)}`

// 快捷设置弹层组件：承载宽高比、照片保存方式等拍摄快捷配置。
export const QuickSettingsPanel = ({
  ratios,
  ratio,
  captureTimerMode,
  photoSaveMode,
  filterRenderQuality,
  focusLocked,
  rearExposure,
  frontExposure,
  rearWhiteBalancePreset,
  frontWhiteBalancePreset,
  onChangeRatio,
  onToggleCaptureTimer,
  onChangePhotoSaveMode,
  onChangeFilterRenderQuality,
  onToggleFocusLock,
  onOpenExposurePanel,
  onOpenWhiteBalancePanel,
}: {
  ratios: string[]
  ratio: string
  captureTimerMode: CaptureTimerMode
  photoSaveMode: PhotoSaveMode
  filterRenderQuality: DualCameraFilterRenderQuality
  focusLocked: boolean
  rearExposure: number
  frontExposure: number
  rearWhiteBalancePreset: WhiteBalancePreset
  frontWhiteBalancePreset: WhiteBalancePreset
  onChangeRatio: (ratio: string) => void
  onToggleCaptureTimer: () => void
  onChangePhotoSaveMode: (mode: PhotoSaveMode) => void
  onChangeFilterRenderQuality: (quality: DualCameraFilterRenderQuality) => void
  onToggleFocusLock: () => void
  onOpenExposurePanel: () => void
  onOpenWhiteBalancePanel: () => void
}) => {
  const { t } = useTranslation()
  const localizedRatios = ratios.map(item => ({
    value: item,
    label: item === '全屏' ? t('options.full') : item,
  }))
  const formatWhiteBalance = (preset: WhiteBalancePreset) =>
    getWhiteBalanceLabel(preset, t)

  return (
    <GlassPanel style={styles.quickPanel}>
      <Text style={styles.panelTitle}>{t('quickSettings.title')}</Text>
      <Text style={styles.settingLabel}>{t('quickSettings.ratio')}</Text>
      <View style={styles.ratioGroup}>
        {localizedRatios.map(item => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.ratioItem,
              ratio === item.value && styles.ratioItemActive,
            ]}
            onPress={() => onChangeRatio(item.value)}
          >
            <Text
              style={[
                styles.ratioText,
                ratio === item.value && styles.ratioTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <SettingLine
        label={t('quickSettings.captureTimer')}
        value={captureTimerMode === 'off' ? t('options.off') : captureTimerMode}
        onPress={onToggleCaptureTimer}
      />
      <View style={styles.saveModeGroup}>
        <Text style={styles.settingLabel}>
          {t('quickSettings.photoQuality')}
        </Text>
        <View style={styles.saveModeButtons}>
          {dualCameraFilterRenderQualityPresets.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.saveModeButton,
                filterRenderQuality === item.id && styles.saveModeButtonActive,
              ]}
              activeOpacity={0.8}
              onPress={() => onChangeFilterRenderQuality(item.id)}
            >
              <Text
                style={[
                  styles.saveModeText,
                  filterRenderQuality === item.id && styles.saveModeTextActive,
                ]}
              >
                {item.id === 'standard' ? t('options.standard') : item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.saveModeGroup}>
        <Text style={styles.settingLabel}>{t('quickSettings.photoSave')}</Text>
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
              {t('options.combined')}
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
              {t('options.separate')}
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
              {t('options.combinedAndSeparate')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <SettingLine
        label={t('quickSettings.focusLock')}
        value={
          focusLocked
            ? t('quickSettings.focusLocked')
            : t('quickSettings.focusUnlocked')
        }
        onPress={onToggleFocusLock}
      />
      <SettingLine
        label={t('quickSettings.exposure')}
        value={`${t('quickSettings.rearShort')} ${formatExposure(
          rearExposure,
        )} / ${t('quickSettings.frontShort')} ${formatExposure(frontExposure)}`}
        onPress={onOpenExposurePanel}
      />
      <SettingLine
        label={t('quickSettings.whiteBalance')}
        value={`${t('quickSettings.rearShort')} ${formatWhiteBalance(
          rearWhiteBalancePreset,
        )} / ${t('quickSettings.frontShort')} ${formatWhiteBalance(
          frontWhiteBalancePreset,
        )}`}
        onPress={onOpenWhiteBalancePanel}
      />
    </GlassPanel>
  )
}

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
  ratioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  ratioItem: {
    width: 50,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
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
