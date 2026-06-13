import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { useTranslation } from 'react-i18next'
import { ToggleRow } from '../controls'
import { TopMenuPanelShell } from './topMenuPanelShell'

// AI 增强面板：承载可直接接入原生相机控制器的增强能力。
export const TopMenuAiEnhancePanel = ({
  top,
  smartHDREnabled,
  smartHDRSupported,
  lowLightBoostEnabled,
  lowLightBoostSupported,
  smoothFocusEnabled,
  smoothFocusSupported,
  distortionCorrectionEnabled,
  distortionCorrectionSupported,
  onToggleSmartHDR,
  onToggleLowLightBoost,
  onToggleSmoothFocus,
  onToggleDistortionCorrection,
  onBack,
  onClose,
}: {
  top: number
  smartHDREnabled: boolean
  smartHDRSupported: boolean
  lowLightBoostEnabled: boolean
  lowLightBoostSupported: boolean
  smoothFocusEnabled: boolean
  smoothFocusSupported: boolean
  distortionCorrectionEnabled: boolean
  distortionCorrectionSupported: boolean
  onToggleSmartHDR: (value: boolean) => void
  onToggleLowLightBoost: (value: boolean) => void
  onToggleSmoothFocus: (value: boolean) => void
  onToggleDistortionCorrection: (value: boolean) => void
  onBack: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation()

  return (
    <TopMenuPanelShell
      top={top}
      title={t('aiEnhancePanel.title')}
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
      <View style={styles.introBox}>
        <Text style={styles.introTitle}>{t('aiEnhancePanel.introTitle')}</Text>
        <Text style={styles.introText}>{t('aiEnhancePanel.introText')}</Text>
      </View>
      <View style={styles.optionGroup}>
        <ToggleRow
          icon={<MaterialIcons name="hdr-auto" color="#fff" size={20} />}
          label={t('aiEnhancePanel.smartHDR')}
          value={smartHDREnabled}
          disabled={!smartHDRSupported}
          valueText={smartHDRSupported ? undefined : t('common.unsupported')}
          onValueChange={onToggleSmartHDR}
        />
        <ToggleRow
          icon={<MaterialIcons name="nightlight" color="#fff" size={20} />}
          label={t('aiEnhancePanel.lowLightBoost')}
          value={lowLightBoostEnabled}
          disabled={!lowLightBoostSupported}
          valueText={
            lowLightBoostSupported ? undefined : t('common.unsupported')
          }
          onValueChange={onToggleLowLightBoost}
        />
        <ToggleRow
          icon={
            <MaterialIcons name="center-focus-strong" color="#fff" size={20} />
          }
          label={t('aiEnhancePanel.smoothFocus')}
          value={smoothFocusEnabled}
          disabled={!smoothFocusSupported}
          valueText={smoothFocusSupported ? undefined : t('common.unsupported')}
          onValueChange={onToggleSmoothFocus}
        />
        <ToggleRow
          icon={
            <MaterialIcons name="panorama-wide-angle" color="#fff" size={20} />
          }
          label={t('aiEnhancePanel.distortionCorrection')}
          value={distortionCorrectionEnabled}
          disabled={!distortionCorrectionSupported}
          valueText={
            distortionCorrectionSupported ? undefined : t('common.unsupported')
          }
          onValueChange={onToggleDistortionCorrection}
        />
      </View>
    </TopMenuPanelShell>
  )
}

const styles = StyleSheet.create({
  panel: {
    width: 292,
  },
  introBox: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(88,232,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(88,232,255,0.16)',
  },
  introTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 5,
  },
  introText: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  optionGroup: {
    borderRadius: 16,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
})
