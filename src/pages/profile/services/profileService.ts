import { env } from '@/config'
import { http, uploadFile } from '@/utils'
import type { IUpdateProfileParams } from '../types'

const profileService = {
  getMe() {
    return http.get(`${env.HOST_API_URL}/me`).then(response => response.data)
  },

  updateMe(params: IUpdateProfileParams) {
    return http
      .put(`${env.HOST_API_URL}/me`, params)
      .then(response => response.data)
  },

  uploadAvatar(fileUri: string, fileName: string, fileType: string) {
    return uploadFile(`${env.HOST_API_URL}/file`, {
      uri: fileUri,
      name: fileName,
      type: fileType,
    })
  },
}

export default profileService
