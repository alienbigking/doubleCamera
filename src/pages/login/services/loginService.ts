import { env } from '@/config'
import { http } from '@/utils'
import type {
  LoginRequestType,
  RegisterRequestType,
  SendSmsCodeRequestType,
} from '../types'

export default {
  login(params: LoginRequestType) {
    return http
      .post(`${env.HOST_API_URL}/oauth/token`, params, {
        headers: {
          isDisabledToken: true,
        },
      })
      .then(response => response.data)
  },

  refreshToken(params: any) {
    return http
      .post(`${env.HOST_API_URL}/oauth/token`, params, {
        headers: {
          isDisabledToken: true,
        },
      })
      .then(response => response.data)
  },

  register(params: RegisterRequestType) {
    return http
      .post(`${env.HOST_API_URL}/register`, params, {
        headers: {
          isDisabledToken: true,
        },
      })
      .then(response => response.data)
  },

  sendSmsCode(params: SendSmsCodeRequestType) {
    return http
      .post(`${env.HOST_API_URL}/sendSmsCode`, params, {
        headers: {
          isDisabledToken: true,
        },
      })
      .then(response => response.data)
  },
}
