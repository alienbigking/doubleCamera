export interface HelpFeedbackState {
  loading: boolean
  setLoading: (loading: boolean) => void
}

export interface ISubmitFeedbackParams {
  content: string
  contact?: string
}
