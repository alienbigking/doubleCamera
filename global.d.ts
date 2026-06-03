declare const __DEV__: boolean

declare module 'react-native-config' {
  const Config: {
    APP_ENV?: string
    HOST_API_URL?: string
    LOG_LEVEL?: string
    ENABLE_MOCK?: string
    [key: string]: string | undefined
  }
  export default Config
}
