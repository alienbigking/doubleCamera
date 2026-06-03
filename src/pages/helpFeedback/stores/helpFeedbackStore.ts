import { create } from 'zustand'
import type { HelpFeedbackState } from '../types'

const helpFeedbackStore = create<HelpFeedbackState>(set => ({
  loading: false,
  setLoading: loading => set({ loading }),
}))

export const useHelpFeedbackStore = helpFeedbackStore

export default helpFeedbackStore
