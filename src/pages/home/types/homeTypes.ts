export type PlatformId =
  | 'all'
  | 'jd'
  | 'taobao'
  | 'didi'
  | 'meituan'
  | 'pinduoduo'
  | 'eleme'
  | 'douyin'
  | 'other'

export type EntryCategory =
  | 'food'
  | 'shop'
  | 'travel'
  | 'trip'
  | 'life'
  | 'other'

export interface Platform {
  id: PlatformId
  name: string
  color: string
}

export interface Entry {
  id: string
  platform: Exclude<PlatformId, 'all'>
  platformName: string
  platformColor: string
  title: string
  deeplink: string
  category: EntryCategory
  icon?: string
  tag?: string
  appScheme?: string
}

export interface HomeStoreState {
  selectedPlatform: PlatformId
  searchKeyword: string
  platforms: Platform[]
  entries: Entry[]
  setSelectedPlatform: (platform: PlatformId) => void
  setSearchKeyword: (keyword: string) => void
  setHomeConfig: (config: { platforms?: Platform[]; entries?: Entry[] }) => void
}

export interface IOpenEntryParams {
  deeplink: string
  webFallback: string
}
