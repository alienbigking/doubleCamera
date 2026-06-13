import React from 'react'
import { StyleSheet } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { useTranslation } from 'react-i18next'
import { GlassPanel, MenuItem } from '../controls'

// 顶部更多菜单入口组件：只承载功能入口，不承载具体业务面板。
export const MoreMenuPanel = ({
  top,
  proMode,
  onOpenProfessional,
  onOpenDisplay,
  onOpenFilter,
  onOpenAi,
  onOpenAnalytics,
  onOpenGallery,
  onOpenSettings,
}: {
  top: number
  proMode: boolean
  onOpenProfessional: () => void
  onOpenDisplay: () => void
  onOpenFilter: () => void
  onOpenAi: () => void
  onOpenAnalytics: () => void
  onOpenGallery: () => void
  onOpenSettings: () => void
}) => {
  const { t } = useTranslation()

  return (
    <GlassPanel style={[styles.menuPanel, { top }]}>
      <MenuItem
        icon={
          <MaterialIcons name="tune" color="rgba(255,255,255,0.9)" size={21} />
        }
        label={t('menu.professional')}
        value={proMode ? t('common.enabled') : undefined}
        onPress={onOpenProfessional}
      />
      <MenuItem
        icon={
          <MaterialIcons
            name="visibility"
            color="rgba(255,255,255,0.9)"
            size={21}
          />
        }
        label={t('menu.display')}
        onPress={onOpenDisplay}
      />
      <MenuItem
        icon={
          <MaterialIcons
            name="gradient"
            color="rgba(255,255,255,0.9)"
            size={21}
          />
        }
        label={t('menu.filters')}
        onPress={onOpenFilter}
      />
      <MenuItem
        icon={
          <MaterialIcons
            name="auto-awesome"
            color="rgba(255,255,255,0.9)"
            size={21}
          />
        }
        label={t('menu.aiEnhance')}
        onPress={onOpenAi}
      />
      <MenuItem
        icon={
          <MaterialIcons
            name="photo-library"
            color="rgba(255,255,255,0.9)"
            size={21}
          />
        }
        label={t('menu.gallery')}
        onPress={onOpenGallery}
      />
      <MenuItem
        icon={
          <MaterialIcons
            name="analytics"
            color="rgba(255,255,255,0.9)"
            size={21}
          />
        }
        label={t('menu.analytics')}
        onPress={onOpenAnalytics}
      />
      <MenuItem
        icon={
          <MaterialIcons
            name="settings"
            color="rgba(255,255,255,0.9)"
            size={21}
          />
        }
        label={t('menu.settings')}
        onPress={onOpenSettings}
      />
    </GlassPanel>
  )
}

const styles = StyleSheet.create({
  menuPanel: { right: 18, width: 236 },
})
