import Config from 'react-native-config'

export type EnvName = 'develop' | 'stage' | 'production' | 'local'

export type LogLevelType = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export type EnvType = {
  APP_ENV: EnvName
  HOST_API_URL: string
  LOG_LEVEL: LogLevelType
  ENABLE_MOCK: boolean
  OAUTH_CLIENT_ID: string
  OAUTH_CLIENT_SECRET: string
}

const configMap: Record<EnvName, Omit<EnvType, 'APP_ENV'>> = {
  local: {
    HOST_API_URL: 'http://101.33.234.107:3000',
    LOG_LEVEL: 'debug',
    ENABLE_MOCK: true,
    OAUTH_CLIENT_ID: 'discountExpert',
    OAUTH_CLIENT_SECRET: 'discountExpertSecret',
  },
  develop: {
    HOST_API_URL: 'http://101.33.234.107:3000',
    LOG_LEVEL: 'debug',
    ENABLE_MOCK: true,
    OAUTH_CLIENT_ID: 'discountExpert',
    OAUTH_CLIENT_SECRET: 'discountExpertSecret',
  },
  stage: {
    HOST_API_URL: 'http://101.33.234.107:3000',
    LOG_LEVEL: 'info',
    ENABLE_MOCK: false,
    OAUTH_CLIENT_ID: 'discountExpert',
    OAUTH_CLIENT_SECRET: 'discountExpertSecret',
  },
  production: {
    HOST_API_URL: 'http://101.33.234.107:3000',
    LOG_LEVEL: 'warn',
    ENABLE_MOCK: false,
    OAUTH_CLIENT_ID: 'discountExpert',
    OAUTH_CLIENT_SECRET: 'discountExpertSecret',
  },
}

const isEnvName = (value: unknown): value is EnvName => {
  return (
    value === 'develop' ||
    value === 'stage' ||
    value === 'production' ||
    value === 'local'
  )
}

const isLogLevel = (value: unknown): value is LogLevelType => {
  return (
    value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error' ||
    value === 'silent'
  )
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'boolean') return value
  const s = String(value).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true
  if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false
  return undefined
}

const getAppEnv = (): EnvName => {
  const raw = Config.APP_ENV as unknown
  if (isEnvName(raw)) return raw
  return __DEV__ ? 'develop' : 'production'
}

const appEnv = getAppEnv()

export const env: EnvType = {
  APP_ENV: appEnv,
  HOST_API_URL: Config.HOST_API_URL || configMap[appEnv].HOST_API_URL,
  LOG_LEVEL: isLogLevel(Config.LOG_LEVEL)
    ? Config.LOG_LEVEL
    : configMap[appEnv].LOG_LEVEL,
  ENABLE_MOCK:
    parseBoolean(Config.ENABLE_MOCK) !== undefined
      ? (parseBoolean(Config.ENABLE_MOCK) as boolean)
      : configMap[appEnv].ENABLE_MOCK,
  OAUTH_CLIENT_ID: Config.OAUTH_CLIENT_ID || configMap[appEnv].OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET:
    Config.OAUTH_CLIENT_SECRET || configMap[appEnv].OAUTH_CLIENT_SECRET,
}
