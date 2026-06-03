// Login module store
// Demo content - replace with actual state management when implementing features

import { create } from 'zustand'
import type { LoginStoreState } from '../types'

const loginStore = create<LoginStoreState>(set => ({
  demo: false,

  setDemo: (demo: boolean) => set({ demo }),
}))

export default loginStore
