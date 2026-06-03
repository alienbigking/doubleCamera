import { create, StateCreator } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthRouteStateType } from '../types'

const createAuthStore: StateCreator<AuthRouteStateType> = set => ({
  // State
  token: null,
  isLoggedIn: false,

  // Actions (函数)
  setToken: (token: string | null) => set({ token }),
  setLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
  logout: () => set({ token: null, isLoggedIn: false }),
})

export const useAuthRouteStore = create<AuthRouteStateType>()(
  persist(createAuthStore, {
    name: 'auth-gate-store',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: state => ({ token: state.token, isLoggedIn: state.isLoggedIn }),
  }),
)
