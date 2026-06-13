import React from 'react'
import { StyleSheet } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { useTranslation } from 'react-i18next'
import { MenuItem } from '../controls'
import { TopMenuPanelShell } from './topMenuPanelShell'

export const TopMenuAboutPanel = ({
  top,
  versionLabel,
  onRateApp,
  onShareApp,
  onFeedback,
  onOpenPrivacy,
  onBack,
  onClose,
}: {
  top: number
  versionLabel: string
  onRateApp: () => void
  onShareApp: () => void
  onFeedback: () => void
  onOpenPrivacy: () => void
  onBack: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation()

  return (
    <TopMenuPanelShell
      top={top}
      title={t('aboutPanel.title')}
      icon={
        <MaterialIcons
          name="info-outline"
          color="rgba(255,255,255,0.9)"
          size={22}
        />
      }
      onBack={onBack}
      onClose={onClose}
      style={styles.panel}
    >
      <MenuItem
        icon={<MaterialIcons name="star-outline" color="#f0c15d" size={22} />}
        label={t('aboutPanel.rateUs')}
        onPress={onRateApp}
      />
      <MenuItem
        icon={<MaterialIcons name="share" color="#f0c15d" size={22} />}
        label={t('aboutPanel.shareApp')}
        onPress={onShareApp}
      />
      <MenuItem
        icon={<MaterialIcons name="mail-outline" color="#f0c15d" size={22} />}
        label={t('aboutPanel.feedback')}
        onPress={onFeedback}
      />
      <MenuItem
        icon={<MaterialIcons name="policy" color="#f0c15d" size={22} />}
        label={t('aboutPanel.privacy')}
        onPress={onOpenPrivacy}
      />
      <MenuItem
        icon={<MaterialIcons name="new-releases" color="#f0c15d" size={22} />}
        label={t('common.version')}
        value={versionLabel}
      />
    </TopMenuPanelShell>
  )
}

const styles = StyleSheet.create({
  panel: {
    width: 292,
  },
})
