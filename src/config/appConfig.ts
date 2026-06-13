import { Platform } from 'react-native'

export const appConfig = {
  name: '2Camera',
  iosAppStoreId: '',
  androidPackageName: 'com.doublecamera',
  supportEmail: 'support@2camera.app',
}

export const getStoreUrl = (action?: 'review') => {
  if (Platform.OS === 'ios') {
    if (!appConfig.iosAppStoreId) return null
    return action === 'review'
      ? `https://apps.apple.com/app/id${appConfig.iosAppStoreId}?action=write-review`
      : `https://apps.apple.com/app/id${appConfig.iosAppStoreId}`
  }

  return action === 'review'
    ? `market://details?id=${appConfig.androidPackageName}`
    : `https://play.google.com/store/apps/details?id=${appConfig.androidPackageName}`
}

export const getFeedbackMailtoUrl = () =>
  `mailto:${appConfig.supportEmail}?subject=${encodeURIComponent(
    `${appConfig.name} Feedback`,
  )}`
