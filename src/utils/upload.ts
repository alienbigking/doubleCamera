// 统一文件上传封装
// 小文件用 axios，Android 文件上传用 react-native-blob-util

import { Platform } from 'react-native'
import ReactNativeBlobUtil from 'react-native-blob-util'
import { http } from './http'
import { useAuthRouteStore } from '@/components/authRoute/stores'

interface UploadFileParams {
  uri: string
  name?: string
  type?: string
}

interface UploadResult {
  status: number
  data?: { url: string }
  message?: string
}

/**
 * 统一文件上传
 * - iOS: 使用 axios + FormData
 * - Android: 使用 react-native-blob-util（axios 无法读取 file:// 路径）
 */
export async function uploadFile(
  url: string,
  file: UploadFileParams,
): Promise<UploadResult> {
  const token = useAuthRouteStore.getState().token

  // Android 必须使用 blob-util，axios 无法处理 file:// 路径
  if (Platform.OS === 'android') {
    const filePath = file.uri.replace('file://', '')
    const res = await ReactNativeBlobUtil.fetch(
      'POST',
      url,
      {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'multipart/form-data',
      },
      [
        {
          name: 'file',
          filename: file.name || `file_${Date.now()}.jpg`,
          type: file.type || 'image/jpeg',
          data: ReactNativeBlobUtil.wrap(filePath),
        },
      ],
    )
    return res.json()
  }

  // iOS 使用 axios FormData
  const formData = new FormData()
  formData.append('file', {
    uri: file.uri,
    type: file.type || 'image/jpeg',
    name: file.name || `file_${Date.now()}.jpg`,
  } as any)

  const response = await http.post(url, formData)
  return response.data
}
