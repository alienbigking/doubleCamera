import React from 'react'
import { StyleSheet } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { useTranslation } from 'react-i18next'
import { ToggleRow } from '../controls'
import { TopMenuPanelShell } from './topMenuPanelShell'

// 显示与界面面板：承载顶部栏、底部栏等页面可见性控制。
export const TopMenuDisplayPanel = ({
  top,
  showTopBar,
  showBottomBar,
  onToggleTopBar,
  onToggleBottomBar,
  onBack,
  onClose,
}: {
  top: number
  showTopBar: boolean
  showBottomBar: boolean
  onToggleTopBar: (value: boolean) => void
  onToggleBottomBar: (value: boolean) => void
  onBack: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation()

  return (
    <TopMenuPanelShell
      top={top}
      title={t('displayPanel.title')}
      icon={
        <MaterialIcons
          name="visibility"
          color="rgba(255,255,255,0.9)"
          size={22}
        />
      }
      onBack={onBack}
      onClose={onClose}
      style={styles.panel}
    >
      <ToggleRow
        icon={
          <MaterialIcons
            name="vertical-align-top"
            color="rgba(255,255,255,0.84)"
            size={20}
          />
        }
        label={t('displayPanel.topToolbar')}
        value={showTopBar}
        onValueChange={onToggleTopBar}
      />
      <ToggleRow
        icon={
          <MaterialIcons
            name="vertical-align-bottom"
            color="rgba(255,255,255,0.84)"
            size={20}
          />
        }
        label={t('displayPanel.bottomToolbar')}
        value={showBottomBar}
        onValueChange={onToggleBottomBar}
      />
    </TopMenuPanelShell>
  )
}

const styles = StyleSheet.create({
  panel: {
    width: 256,
  },
})
