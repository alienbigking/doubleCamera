import { Alert, Linking } from 'react-native'
import type { Entry } from '../types'

const PLATFORM_STORE_URLS: Record<string, { ios: string; android: string }> = {
  jd: {
    ios: 'https://apps.apple.com/cn/app/id414245413',
    android: 'https://app.jd.com',
  },
  taobao: {
    ios: 'https://apps.apple.com/cn/app/id387682726',
    android: 'https://market.m.taobao.com/app/wireless/download/index.html',
  },
  pinduoduo: {
    ios: 'https://apps.apple.com/cn/app/id1044302328',
    android: 'https://mobile.yangkeduo.com/duo_coupon_landing.html',
  },
  eleme: {
    ios: 'https://apps.apple.com/cn/app/id507161324',
    android: 'https://h5.ele.me/download',
  },
  meituan: {
    ios: 'https://apps.apple.com/cn/app/id423084029',
    android: 'https://i.meituan.com/app/download.html',
  },
  douyin: {
    ios: 'https://apps.apple.com/cn/app/id1142110895',
    android: 'https://www.douyin.com/download',
  },
  didi: {
    ios: 'https://apps.apple.com/cn/app/id554499054',
    android: 'https://www.didiglobal.com/download/customer',
  },
}

const checkAppInstalled = async (scheme: string): Promise<boolean> => {
  try {
    return await Linking.canOpenURL(scheme)
  } catch {
    return false
  }
}

const openEntryService = {
  open: async (entry: Entry): Promise<void> => {
    const { deeplink, platformName, appScheme } = entry

    if (appScheme) {
      const installed = await checkAppInstalled(appScheme)
      if (!installed) {
        const storeUrls = PLATFORM_STORE_URLS[entry.platform]
        Alert.alert(
          `未检测到 ${platformName}`,
          `您尚未安装 ${platformName} App，是否前往下载？`,
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去下载',
              onPress: () => {
                const url = storeUrls?.ios ?? storeUrls?.android
                if (url) {
                  Linking.openURL(url)
                }
              },
            },
          ],
        )
        return
      }
    }

    try {
      await Linking.openURL(deeplink)
    } catch {
      Alert.alert(
        '无法打开',
        `链接打开失败，请检查是否已安装 ${platformName} App`,
      )
    }
  },
}

export default openEntryService
