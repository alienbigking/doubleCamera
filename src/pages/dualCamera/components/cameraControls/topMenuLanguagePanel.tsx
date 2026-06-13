import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { useTranslation } from 'react-i18next'
import { TopMenuPanelShell } from './topMenuPanelShell'
import {
  supportedLanguages,
  type SupportedLanguageCode,
} from '@/i18n/resources'

export const TopMenuLanguagePanel = ({
  top,
  selectedLanguage,
  onSelectLanguage,
  onBack,
  onClose,
}: {
  top: number
  selectedLanguage: SupportedLanguageCode
  onSelectLanguage: (language: SupportedLanguageCode) => void
  onBack: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation()

  return (
    <TopMenuPanelShell
      top={top}
      title={t('common.language')}
      icon={
        <MaterialIcons
          name="translate"
          color="rgba(255,255,255,0.9)"
          size={22}
        />
      }
      onBack={onBack}
      onClose={onClose}
      style={styles.panel}
    >
      <Text style={styles.hint}>{t('settings.languageAutoHint')}</Text>
      <View style={styles.list}>
        {supportedLanguages.map(item => {
          const active = item.code === selectedLanguage
          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.row, active && styles.rowActive]}
              activeOpacity={0.82}
              onPress={() => onSelectLanguage(item.code)}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.nativeLabel}
              </Text>
              {active ? (
                <MaterialIcons name="check" color="#58e8ff" size={20} />
              ) : null}
            </TouchableOpacity>
          )
        })}
      </View>
    </TopMenuPanelShell>
  )
}

const styles = StyleSheet.create({
  panel: {
    width: 292,
  },
  hint: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 8,
  },
  list: {
    gap: 6,
  },
  row: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowActive: {
    backgroundColor: 'rgba(88,232,255,0.12)',
    borderColor: 'rgba(88,232,255,0.34)',
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
  },
  labelActive: {
    color: '#9ff3ff',
  },
})
