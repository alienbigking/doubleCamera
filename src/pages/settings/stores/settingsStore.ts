import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SettingsState } from '../types'

const settingsStore = create<SettingsState>()(
  persist(
    set => ({
      appBackground: '#FAFAF7',
      setAppBackground: (color: string) => set({ appBackground: color }),
      homeBackgroundImagePath: null,
      setHomeBackgroundImagePath: (path: string | null) =>
        set({ homeBackgroundImagePath: path }),
    }),
    {
      name: 'discount-expert-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

export const useSettingsStore = settingsStore

export default settingsStore
