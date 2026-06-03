import { create } from 'zustand'

interface NavigationState {
  currentRoute: string | undefined
  setCurrentRoute: (route: string | undefined) => void
}

export const useNavigationStore = create<NavigationState>(set => ({
  currentRoute: undefined,
  setCurrentRoute: route => set({ currentRoute: route }),
}))
