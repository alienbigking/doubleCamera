import React from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { useTranslation } from 'react-i18next'
import { ModeButton, ToggleRow } from '../controls'
import type {
  AudioChannelMode,
  AudioQualityMode,
  DualVideoComposeMode,
  VideoFrameRateMode,
  VideoResolutionMode,
  VideoSaveMode,
} from './types'
import { TopMenuPanelShell } from './topMenuPanelShell'

const formatVideoResolution = (mode: VideoResolutionMode) =>
  mode === '4k' ? '1080p' : mode

const formatVideoFrameRate = (fps: VideoFrameRateMode) => `${fps}fps`
const formatAudioChannel = (
  mode: AudioChannelMode,
  t: (key: string) => string,
) => {
  if (mode === 'off') return t('options.off')
  if (mode === 'mono') return t('options.mono')
  return t('options.stereo')
}

const formatAudioQuality = (
  mode: AudioQualityMode,
  t: (key: string) => string,
) => {
  if (mode === 'high') return t('options.high')
  if (mode === 'max') return t('options.max')
  return t('options.standard')
}

const formatComposeMode = (
  mode: DualVideoComposeMode,
  t: (key: string) => string,
) => (mode === 'pip' ? t('options.pip') : t('options.split'))

const formatVideoSaveMode = (
  mode: VideoSaveMode,
  t: (key: string) => string,
) => {
  if (mode === 'combined') return t('options.combined')
  if (mode === 'separate') return t('options.separate')
  return t('options.combinedAndSeparate')
}

// 设置面板：承载右上角菜单里的拍摄、视频、界面和高级设置项。
export const TopMenuSettingsPanel = ({
  top,
  gridEnabled,
  captureTimerEnabled,
  photoHDREnabled,
  photoHDRSupported,
  lensSwitchHintEnabled,
  videoResolution,
  videoFrameRate,
  videoFrameRateOptions,
  audioChannelMode,
  audioQualityMode,
  dualVideoComposeMode,
  videoSaveMode,
  proVideoEnabled,
  volumeShutterEnabled,
  saveLocationEnabled,
  pipBorderVisible,
  reduceTransparencyEnabled,
  flashIndicatorEnabled,
  aiSceneEnabled,
  captureAnalyticsEnabled,
  languageLabel,
  onToggleGrid,
  onToggleCaptureTimer,
  onTogglePhotoHDR,
  onToggleLensSwitchHint,
  onSetVideoResolution,
  onSetVideoFrameRate,
  onSetAudioChannelMode,
  onSetAudioQualityMode,
  onSetDualVideoComposeMode,
  onSetVideoSaveMode,
  onToggleProVideo,
  onToggleVolumeShutter,
  onToggleSaveLocation,
  onTogglePipBorder,
  onToggleReduceTransparency,
  onToggleFlashIndicator,
  onToggleAiScene,
  onToggleCaptureAnalytics,
  onOpenAbout,
  onOpenLanguage,
  onBack,
  onClose,
}: {
  top: number
  gridEnabled: boolean
  captureTimerEnabled: boolean
  photoHDREnabled: boolean
  photoHDRSupported: boolean
  lensSwitchHintEnabled: boolean
  videoResolution: VideoResolutionMode
  videoFrameRate: VideoFrameRateMode
  videoFrameRateOptions: VideoFrameRateMode[]
  audioChannelMode: AudioChannelMode
  audioQualityMode: AudioQualityMode
  dualVideoComposeMode: DualVideoComposeMode
  videoSaveMode: VideoSaveMode
  proVideoEnabled: boolean
  volumeShutterEnabled: boolean
  saveLocationEnabled: boolean
  pipBorderVisible: boolean
  reduceTransparencyEnabled: boolean
  flashIndicatorEnabled: boolean
  aiSceneEnabled: boolean
  captureAnalyticsEnabled: boolean
  languageLabel: string
  onToggleGrid: (value: boolean) => void
  onToggleCaptureTimer: (value: boolean) => void
  onTogglePhotoHDR: (value: boolean) => void
  onToggleLensSwitchHint: (value: boolean) => void
  onSetVideoResolution: (mode: VideoResolutionMode) => void
  onSetVideoFrameRate: (fps: VideoFrameRateMode) => void
  onSetAudioChannelMode: (mode: AudioChannelMode) => void
  onSetAudioQualityMode: (mode: AudioQualityMode) => void
  onSetDualVideoComposeMode: (mode: DualVideoComposeMode) => void
  onSetVideoSaveMode: (mode: VideoSaveMode) => void
  onToggleProVideo: (value: boolean) => void
  onToggleVolumeShutter: (value: boolean) => void
  onToggleSaveLocation: (value: boolean) => void
  onTogglePipBorder: (value: boolean) => void
  onToggleReduceTransparency: (value: boolean) => void
  onToggleFlashIndicator: (value: boolean) => void
  onToggleAiScene: (value: boolean) => void
  onToggleCaptureAnalytics: (value: boolean) => void
  onOpenAbout: () => void
  onOpenLanguage: () => void
  onBack: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation()

  return (
    <TopMenuPanelShell
      top={top}
      title={t('settings.title')}
      icon={
        <MaterialIcons
          name="settings"
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
        <SettingsSection title={t('settings.captureSection')}>
          <ToggleRow
            icon={<MaterialIcons name="grid-on" color="#fff" size={20} />}
            label={t('settings.grid')}
            value={gridEnabled}
            onValueChange={onToggleGrid}
          />
          <ToggleRow
            icon={<MaterialIcons name="timer" color="#fff" size={20} />}
            label={t('settings.captureTimer')}
            value={captureTimerEnabled}
            onValueChange={onToggleCaptureTimer}
          />
          <ToggleRow
            icon={<MaterialIcons name="hdr-on" color="#fff" size={20} />}
            label={t('settings.hdr')}
            value={photoHDREnabled}
            disabled={!photoHDRSupported}
            valueText={photoHDRSupported ? undefined : t('common.unsupported')}
            onValueChange={onTogglePhotoHDR}
          />
          <ToggleRow
            icon={<MaterialIcons name="camera" color="#fff" size={20} />}
            label={t('settings.lensSwitchHint')}
            value={lensSwitchHintEnabled}
            onValueChange={onToggleLensSwitchHint}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.videoSection')}>
          <ChoiceRow
            label={t('settings.resolution')}
            value={formatVideoResolution(videoResolution)}
            options={[
              { label: '720p', value: '720p' },
              { label: '1080p', value: '1080p' },
            ]}
            selectedValue={videoResolution}
            onSelect={value =>
              onSetVideoResolution(value as VideoResolutionMode)
            }
          />
          <ChoiceRow
            label={t('settings.frameRate')}
            value={formatVideoFrameRate(videoFrameRate)}
            options={videoFrameRateOptions.map(option => ({
              label: `${option}fps`,
              value: option,
            }))}
            selectedValue={videoFrameRate}
            onSelect={value => onSetVideoFrameRate(value as VideoFrameRateMode)}
          />
          <ChoiceRow
            label={t('settings.audioChannel')}
            value={formatAudioChannel(audioChannelMode, t)}
            options={[
              { label: t('options.off'), value: 'off' },
              { label: t('options.mono'), value: 'mono' },
              { label: t('options.stereo'), value: 'stereo' },
            ]}
            selectedValue={audioChannelMode}
            onSelect={value => onSetAudioChannelMode(value as AudioChannelMode)}
          />
          <ChoiceRow
            label={t('settings.audioQuality')}
            value={formatAudioQuality(audioQualityMode, t)}
            options={[
              { label: t('options.standard'), value: 'standard' },
              { label: t('options.high'), value: 'high' },
              { label: t('options.max'), value: 'max' },
            ]}
            selectedValue={audioQualityMode}
            onSelect={value => onSetAudioQualityMode(value as AudioQualityMode)}
          />
          <ChoiceRow
            label={t('settings.dualVideoCompose')}
            value={formatComposeMode(dualVideoComposeMode, t)}
            options={[
              { label: t('options.pip'), value: 'pip' },
              { label: t('options.split'), value: 'split' },
            ]}
            selectedValue={dualVideoComposeMode}
            onSelect={value =>
              onSetDualVideoComposeMode(value as DualVideoComposeMode)
            }
          />
          <ChoiceRow
            label={t('settings.videoSave')}
            value={formatVideoSaveMode(videoSaveMode, t)}
            options={[
              { label: t('options.combined'), value: 'combined' },
              { label: t('options.separate'), value: 'separate' },
              {
                label: t('options.combinedAndSeparate'),
                value: 'combinedAndSeparate',
              },
            ]}
            selectedValue={videoSaveMode}
            onSelect={value => onSetVideoSaveMode(value as VideoSaveMode)}
          />
          <ToggleRow
            icon={<MaterialIcons name="tune" color="#fff" size={20} />}
            label={t('settings.proVideo')}
            value={proVideoEnabled}
            onValueChange={onToggleProVideo}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.displaySection')}>
          <ToggleRow
            icon={<MaterialIcons name="volume-up" color="#fff" size={20} />}
            label={t('settings.volumeShutter')}
            value={volumeShutterEnabled}
            onValueChange={onToggleVolumeShutter}
          />
          <ToggleRow
            icon={<MaterialIcons name="place" color="#fff" size={20} />}
            label={t('settings.saveLocation')}
            value={saveLocationEnabled}
            onValueChange={onToggleSaveLocation}
          />
          <ToggleRow
            icon={
              <MaterialIcons
                name="picture-in-picture-alt"
                color="#fff"
                size={20}
              />
            }
            label={t('settings.pipBorder')}
            value={pipBorderVisible}
            onValueChange={onTogglePipBorder}
          />
          <ToggleRow
            icon={<MaterialIcons name="battery-saver" color="#fff" size={20} />}
            label={t('settings.reduceTransparency')}
            value={reduceTransparencyEnabled}
            onValueChange={onToggleReduceTransparency}
          />
          <ToggleRow
            icon={<MaterialIcons name="flash-on" color="#fff" size={20} />}
            label={t('settings.flashIndicator')}
            value={flashIndicatorEnabled}
            onValueChange={onToggleFlashIndicator}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.advancedSection')}>
          <ToggleRow
            icon={<MaterialIcons name="auto-awesome" color="#fff" size={20} />}
            label={t('settings.aiScene')}
            value={aiSceneEnabled}
            onValueChange={onToggleAiScene}
          />
          <ToggleRow
            icon={<MaterialIcons name="analytics" color="#fff" size={20} />}
            label={t('settings.captureAnalytics')}
            value={captureAnalyticsEnabled}
            onValueChange={onToggleCaptureAnalytics}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.aboutAndLanguage')}>
          <SettingEntry
            icon={<MaterialIcons name="info-outline" color="#fff" size={20} />}
            label={t('settings.aboutEntry')}
            onPress={onOpenAbout}
          />
          <SettingEntry
            icon={<MaterialIcons name="translate" color="#fff" size={20} />}
            label={t('settings.languageEntry')}
            value={languageLabel}
            onPress={onOpenLanguage}
          />
        </SettingsSection>
      </ScrollView>
    </TopMenuPanelShell>
  )
}

const SettingsSection = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
)

const ChoiceRow = ({
  label,
  value,
  options,
  selectedValue,
  onSelect,
}: {
  label: string
  value: string
  options: Array<{ label: string; value: string | number }>
  selectedValue: string | number
  onSelect: (value: string | number) => void
}) => (
  <View style={styles.choiceRow}>
    <View style={styles.choiceHeader}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <Text style={styles.choiceValue}>{value}</Text>
    </View>
    <View style={styles.choiceButtons}>
      {options.map(option => (
        <ModeButton
          key={option.value}
          active={option.value === selectedValue}
          label={option.label}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </View>
  </View>
)

const SettingEntry = ({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onPress: () => void
}) => (
  <TouchableOpacity
    style={styles.settingEntry}
    activeOpacity={0.78}
    onPress={onPress}
  >
    <View style={styles.settingEntryLeft}>
      <View style={styles.settingEntryIcon}>{icon}</View>
      <Text style={styles.settingEntryLabel}>{label}</Text>
    </View>
    <View style={styles.settingEntryRight}>
      {value ? <Text style={styles.settingEntryValue}>{value}</Text> : null}
      <Text style={styles.settingEntryArrow}>›</Text>
    </View>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  panel: {
    width: 308,
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
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 12,
    fontWeight: '400',
    marginHorizontal: 4,
  },
  sectionContent: {
    borderRadius: 16,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  choiceRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 9,
  },
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  choiceLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
  },
  choiceValue: {
    color: '#58e8ff',
    fontSize: 12,
    fontWeight: '400',
  },
  choiceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  settingEntry: {
    minHeight: 46,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingEntryIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingEntryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
  },
  settingEntryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingEntryValue: {
    color: '#58e8ff',
    fontSize: 12,
    fontWeight: '400',
  },
  settingEntryArrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 24,
    fontWeight: '400',
  },
})
