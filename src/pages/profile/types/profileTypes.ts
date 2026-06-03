export interface UserInfo {
  id: string
  nickname: string
  avatar?: string
}

export interface IUpdateProfileParams {
  nickname?: string
  avatar?: string
}

export interface ProfileStoreState {
  userInfo: UserInfo | null
  setUserInfo: (userInfo: UserInfo | null) => void
}
