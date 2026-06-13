import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  defaultLanguage,
  supportedLanguages,
  translationResources,
  type SupportedLanguageCode,
} from './resources'

const LANGUAGE_STORAGE_KEY = 'doubleCamera.language'

const normalizeLanguageCode = (
  value?: string | null,
): SupportedLanguageCode => {
  if (!value) return defaultLanguage
  const base = value.toLowerCase().split('-')[0] as SupportedLanguageCode
  return supportedLanguages.some(item => item.code === base)
    ? base
    : defaultLanguage
}

type LocalizeModule = {
  getLocales: () => Array<{ languageCode?: string }>
}

const getRNLocalize = (): LocalizeModule | null => {
  try {
    const localize = require('react-native-localize') as LocalizeModule
    return localize
  } catch (error) {
    console.warn(
      'react-native-localize is unavailable, fallback to default',
      error,
    )
    return null
  }
}

export const getSystemLanguage = () => {
  const locales = getRNLocalize()?.getLocales() || []
  return normalizeLanguageCode(locales[0]?.languageCode)
}

export const loadStoredLanguage = async () => {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
  return normalizeLanguageCode(stored)
}

export const persistLanguage = async (language: SupportedLanguageCode) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language)
}

export const initI18n = async () => {
  const initialLanguage = await loadStoredLanguage()

  await i18n.use(initReactI18next).init({
    lng: initialLanguage || getSystemLanguage(),
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    resources: translationResources,
    interpolation: {
      escapeValue: false,
    },
  })

  return i18n
}

export const changeLanguage = async (language: SupportedLanguageCode) => {
  const next = normalizeLanguageCode(language)
  await persistLanguage(next)
  await i18n.changeLanguage(next)
}

export { LANGUAGE_STORAGE_KEY }
export default i18n
