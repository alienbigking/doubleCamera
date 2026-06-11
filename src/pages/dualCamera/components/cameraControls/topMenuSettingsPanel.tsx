import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
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
const formatAudioChannel = (mode: AudioChannelMode) => {
  if (mode === 'off') return '关闭'
  if (mode === 'mono') return '单声道'
  return '立体声'
}

const formatAudioQuality = (mode: AudioQualityMode) => {
  if (mode === 'high') return '高清'
  if (mode === 'max') return '原声'
  return '标准'
}

const formatComposeMode = (mode: DualVideoComposeMode) =>
  mode === 'pip' ? '画中画' : '上下分屏'

const formatVideoSaveMode = (mode: VideoSaveMode) => {
  if (mode === 'combined') return '合成一个'
  if (mode === 'separate') return '分别保存'
  return '合成+分别'
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
  onBack: () => void
  onClose: () => void
}) => (
  <TopMenuPanelShell
    top={top}
    title="设置"
    icon={
      <MaterialIcons name="settings" color="rgba(255,255,255,0.9)" size={22} />
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
      <SettingsSection title="拍摄设置">
        <ToggleRow
          icon={<MaterialIcons name="grid-on" color="#fff" size={20} />}
          label="网格辅助线"
          value={gridEnabled}
          onValueChange={onToggleGrid}
        />
        <ToggleRow
          icon={<MaterialIcons name="timer" color="#fff" size={20} />}
          label="定时拍照"
          value={captureTimerEnabled}
          onValueChange={onToggleCaptureTimer}
        />
        <ToggleRow
          icon={<MaterialIcons name="hdr-on" color="#fff" size={20} />}
          label="HDR"
          value={photoHDREnabled}
          disabled={!photoHDRSupported}
          valueText={photoHDRSupported ? undefined : '不支持'}
          onValueChange={onTogglePhotoHDR}
        />
        <ToggleRow
          icon={<MaterialIcons name="camera" color="#fff" size={20} />}
          label="焦段切换提示"
          value={lensSwitchHintEnabled}
          onValueChange={onToggleLensSwitchHint}
        />
      </SettingsSection>

      <SettingsSection title="视频设置">
        <ChoiceRow
          label="分辨率"
          value={formatVideoResolution(videoResolution)}
          options={[
            { label: '720p', value: '720p' },
            { label: '1080p', value: '1080p' },
          ]}
          selectedValue={videoResolution}
          onSelect={value => onSetVideoResolution(value as VideoResolutionMode)}
        />
        <ChoiceRow
          label="帧率"
          value={formatVideoFrameRate(videoFrameRate)}
          options={videoFrameRateOptions.map(option => ({
            label: `${option}fps`,
            value: option,
          }))}
          selectedValue={videoFrameRate}
          onSelect={value => onSetVideoFrameRate(value as VideoFrameRateMode)}
        />
        <ChoiceRow
          label="音频声道"
          value={formatAudioChannel(audioChannelMode)}
          options={[
            { label: '关闭', value: 'off' },
            { label: '单声道', value: 'mono' },
            { label: '立体声', value: 'stereo' },
          ]}
          selectedValue={audioChannelMode}
          onSelect={value => onSetAudioChannelMode(value as AudioChannelMode)}
        />
        <ChoiceRow
          label="音频质量"
          value={formatAudioQuality(audioQualityMode)}
          options={[
            { label: '标准', value: 'standard' },
            { label: '高清', value: 'high' },
            { label: '原声', value: 'max' },
          ]}
          selectedValue={audioQualityMode}
          onSelect={value => onSetAudioQualityMode(value as AudioQualityMode)}
        />
        <ChoiceRow
          label="双视频合成"
          value={formatComposeMode(dualVideoComposeMode)}
          options={[
            { label: '画中画', value: 'pip' },
            { label: '分屏', value: 'split' },
          ]}
          selectedValue={dualVideoComposeMode}
          onSelect={value =>
            onSetDualVideoComposeMode(value as DualVideoComposeMode)
          }
        />
        <ChoiceRow
          label="视频保存"
          value={formatVideoSaveMode(videoSaveMode)}
          options={[
            { label: '合成', value: 'combined' },
            { label: '分别', value: 'separate' },
            { label: '同时', value: 'combinedAndSeparate' },
          ]}
          selectedValue={videoSaveMode}
          onSelect={value => onSetVideoSaveMode(value as VideoSaveMode)}
        />
        <ToggleRow
          icon={<MaterialIcons name="tune" color="#fff" size={20} />}
          label="专业模式录制"
          value={proVideoEnabled}
          onValueChange={onToggleProVideo}
        />
      </SettingsSection>

      <SettingsSection title="界面设置">
        <ToggleRow
          icon={<MaterialIcons name="volume-up" color="#fff" size={20} />}
          label="音量键快门"
          value={volumeShutterEnabled}
          onValueChange={onToggleVolumeShutter}
        />
        <ToggleRow
          icon={<MaterialIcons name="place" color="#fff" size={20} />}
          label="保存位置信息"
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
          label="小窗白色边框"
          value={pipBorderVisible}
          onValueChange={onTogglePipBorder}
        />
        <ToggleRow
          icon={<MaterialIcons name="battery-saver" color="#fff" size={20} />}
          label="降低透明度省电"
          value={reduceTransparencyEnabled}
          onValueChange={onToggleReduceTransparency}
        />
        <ToggleRow
          icon={<MaterialIcons name="flash-on" color="#fff" size={20} />}
          label="显示闪光灯标识"
          value={flashIndicatorEnabled}
          onValueChange={onToggleFlashIndicator}
        />
      </SettingsSection>

      <SettingsSection title="高级设置">
        <ToggleRow
          icon={<MaterialIcons name="auto-awesome" color="#fff" size={20} />}
          label="AI场景识别"
          value={aiSceneEnabled}
          onValueChange={onToggleAiScene}
        />
        <ToggleRow
          icon={<MaterialIcons name="analytics" color="#fff" size={20} />}
          label="拍摄数据分析"
          value={captureAnalyticsEnabled}
          onValueChange={onToggleCaptureAnalytics}
        />
      </SettingsSection>
    </ScrollView>
  </TopMenuPanelShell>
)

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
})
