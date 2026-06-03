export interface SettingsState {
  appBackground: string
  setAppBackground: (color: string) => void
  homeBackgroundImagePath: string | null
  setHomeBackgroundImagePath: (path: string | null) => void
}
