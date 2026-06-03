import { create } from 'zustand'
import type { ProfileStoreState } from '../types'

const profileStore = create<ProfileStoreState>(set => ({
  userInfo: null,
  setUserInfo: userInfo => set({ userInfo }),
}))

export default profileStore
