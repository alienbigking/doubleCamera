import { Linking } from 'react-native'
import { Toast } from 'toastify-react-native'
import { http } from '@/utils/http'
import { env } from '@/config'
import type { Entry, IOpenEntryParams, Platform } from '../types'

export type HomeConfigResponse = {
  status: number
  code: string
  message: string
  data?: {
    platforms?: Platform[]
    entries?: Entry[]
  }
}

const homeService = {
  getHomeConfig() {
    return http
      .get<HomeConfigResponse>(
        `${env.HOST_API_URL}/api/discountExpert/home/config`,
      )
      .then(response => response.data)
  },

  async openEntry(params: IOpenEntryParams) {
    const { deeplink, webFallback } = params
    try {
      await Linking.openURL(deeplink)
    } catch {
      if (webFallback) {
        try {
          await Linking.openURL(webFallback)
        } catch {
          Toast.error('无法打开，请检查网络')
        }
      } else {
        Toast.info('请先安装对应 App 再使用此入口')
      }
    }
  },
}

export default homeService
