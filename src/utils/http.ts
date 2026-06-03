import axios, { AxiosError, AxiosInstance } from 'axios'
import { useAuthRouteStore } from '@/components/authRoute/stores'
import { navigate } from '@/navigation/navigationService'
import { Toast } from 'toastify-react-native'

const http: AxiosInstance = axios.create({
  timeout: 180000,
  headers: {
    // 'Content-Type': 'application/json',
  },
})

http.interceptors.request.use(
  config => {
    // 获取 isDisabledToken（从 headers 对象或 rawHeaders）
    const rawHeaders = config.headers as any
    const isDisabledToken =
      rawHeaders?.isDisabledToken || rawHeaders?.common?.isDisabledToken

    if (isDisabledToken) {
      // 删除自定义标记，不添加 token
      delete rawHeaders.isDisabledToken
      delete rawHeaders.common?.isDisabledToken
      return config
    }

    const token = useAuthRouteStore.getState().token
    // console.log('拦截器 token:', token ? '存在' : '无', token?.substring(0, 15))

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // console.log('已设置 Authorization')
    }
    return config
  },
  error => Promise.reject(error),
)

// HTTP 状态码 -> 默认错误文案
const HTTP_ERROR_MESSAGE: Record<number, string> = {
  400: '请求参数错误',
  403: '没有访问权限',
  404: '请求的资源不存在',
  405: '请求方法不允许',
  408: '请求超时，请稍后重试',
  500: '服务器开小差了，请稍后重试',
  501: '服务暂未实现',
  502: '网关错误，请稍后重试',
  503: '服务暂不可用，请稍后重试',
  504: '网关超时，请稍后重试',
}

http.interceptors.response.use(
  response => {
    // console.log('响应数据', response.data)
    return response
  },
  (error: AxiosError<any>) => {
    console.log('响应错误', error.response?.data)
    const status = error.response?.status
    const backendMessage = (error.response?.data as any)?.message

    // 401 单独处理：踢出登录
    if (status === 401) {
      useAuthRouteStore.getState().logout()
      navigate('Login')
      Toast.error('登录已过期，请重新登录')
      return Promise.reject(error)
    }

    // 其他 HTTP 错误统一在此提示，业务层无需重复处理
    if (status && HTTP_ERROR_MESSAGE[status]) {
      Toast.error(backendMessage || HTTP_ERROR_MESSAGE[status])
    } else if (error.code === 'ECONNABORTED') {
      Toast.error('请求超时，请检查网络后重试')
    } else if (error.message === 'Network Error') {
      Toast.error('网络异常，请检查网络后重试')
    } else if (status) {
      Toast.error(backendMessage || `请求失败（${status}）`)
    } else {
      Toast.error(backendMessage || error.message || '请求失败，请稍后重试')
    }

    return Promise.reject(error)
  },
)

export { http }
