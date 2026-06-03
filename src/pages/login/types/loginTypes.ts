export type LoginDemoType = {
  id: string
}

export type LoginRequestType = {
  clientId: string
  clientSecret: string
  userIdentifier: string
  credential: string
  identityType: string
}

export type LoginResponseType = {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: {
    userId: string
    userIdentifier: string
  }
}

export type RefreshTokenResponseType = {
  token: string
}

export type RegisterRequestType = {
  phone?: string
  password: string
  username?: string
  nickname?: string
  phoneCode?: string
}

export type RegisterResponseType = {
  userId: string
  nickname: string
  avatar: string | null
  identifiers: string[]
}

export type SendSmsCodeRequestType = {
  phone: string
}

export interface LoginStoreState {
  demo: boolean

  // Actions
  setDemo: (demo: boolean) => void
}
