import AsyncStorage from '@react-native-async-storage/async-storage'

export type GalleryAssetKind = 'dualPhoto' | 'singlePhoto' | 'video'

type GalleryAssetIndex = Record<string, GalleryAssetKind>

const galleryAssetIndexKey = 'doubleCamera.galleryAssetIndex.v1'

const readGalleryAssetIndex = async (): Promise<GalleryAssetIndex> => {
  const rawValue = await AsyncStorage.getItem(galleryAssetIndexKey)
  if (!rawValue) return {}

  try {
    const parsedValue = JSON.parse(rawValue)
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
  } catch {
    return {}
  }
}

export const getGalleryAssetIndex = readGalleryAssetIndex

// 记录相册资源的业务类型，用于区分合成双摄照、普通单张照片和视频。
export const markGalleryAssets = async (
  ids: string[],
  kind: GalleryAssetKind,
) => {
  if (ids.length === 0) return

  const index = await readGalleryAssetIndex()
  ids.forEach(id => {
    index[id] = kind
  })

  await AsyncStorage.setItem(galleryAssetIndexKey, JSON.stringify(index))
}
