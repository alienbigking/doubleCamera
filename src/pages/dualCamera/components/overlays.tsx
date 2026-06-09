import React, { useEffect, useMemo, useState } from 'react'
import { type GalleryAssetKind } from './galleryAssetIndex'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'

type CameraSide = 'rear' | 'front'

export type CapturedPhotoPair = Partial<Record<CameraSide, string>> & {
  combined?: string
  capturedAt?: string
}

export type GalleryAsset = {
  id: string
  uri: string
  type: string
  filename?: string
  kind?: GalleryAssetKind
}

type GalleryFilter = 'all' | 'dualPhoto' | 'video'
type GalleryViewMode = 'grid' | 'large'

const galleryFilters: { id: GalleryFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'dualPhoto', label: '双摄照片' },
  { id: 'video', label: '视频' },
]

const isVideoAsset = (asset: GalleryAsset) =>
  asset.type.toLowerCase().includes('video')

const getGalleryAssetLabel = (asset: GalleryAsset) => {
  if (isVideoAsset(asset)) return '视频'
  if (asset.kind === 'dualPhoto') return '双摄照片'
  return '照片'
}

const normalizeFileUri = (uri: string) =>
  uri.startsWith('/') ? `file://${uri}` : uri

const stripFileUriPrefix = (uri: string) =>
  decodeURIComponent(uri.replace(/^file:\/\//, ''))

const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^\w.-]+/g, '_')

const getAssetExtension = (asset: GalleryAsset) => {
  const fileNameExtension = asset.filename?.match(/\.([a-zA-Z0-9]+)$/)?.[1]
  if (fileNameExtension) return fileNameExtension.toLowerCase()
  return isVideoAsset(asset) ? 'mp4' : 'jpg'
}

const getAssetMimeType = (asset: GalleryAsset) =>
  isVideoAsset(asset) ? 'video/mp4' : 'image/jpeg'

const getShareFileName = (asset: GalleryAsset, index: number) => {
  const extension = getAssetExtension(asset)
  const fileName = asset.filename
    ? sanitizeFileName(asset.filename)
    : `dualcam-${Date.now()}-${index}.${extension}`

  return fileName.includes('.') ? fileName : `${fileName}.${extension}`
}

const getAssetLocalUri = async (asset: GalleryAsset) => {
  if (Platform.OS !== 'ios' || !asset.uri.startsWith('ph://')) {
    return normalizeFileUri(asset.uri)
  }

  const result = await CameraRoll.iosGetImageDataById(asset.id, {
    convertHeicImages: true,
    quality: 1,
  })
  return normalizeFileUri(result.node.image.filepath || result.node.image.uri)
}

const prepareShareableAssetFile = async (
  asset: GalleryAsset,
  index: number,
) => {
  const localUri = await getAssetLocalUri(asset)
  const fileName = getShareFileName(asset, index)
  const sourcePath = stripFileUriPrefix(localUri)
  const destinationPath = `${
    RNFS.CachesDirectoryPath
  }/${Date.now()}-${index}-${fileName}`

  await RNFS.copyFile(sourcePath, destinationPath)

  return {
    url: `file://${destinationPath}`,
    filename: fileName,
    mimeType: getAssetMimeType(asset),
  }
}

export const CapturePreview = ({
  visible,
  photos,
  onClose,
}: {
  visible: boolean
  photos: CapturedPhotoPair
  onClose: () => void
}) => (
  <Modal visible={visible} animationType="fade" transparent>
    <View style={styles.modalBackdrop}>
      <View style={styles.previewCard}>
        <Text style={styles.modalTitle}>拍照预览</Text>
        {photos.capturedAt && (
          <Text style={styles.captureMeta}>{photos.capturedAt}</Text>
        )}
        {photos.combined && (
          <View style={styles.combinedPreview}>
            <Image
              source={{ uri: photos.combined }}
              style={styles.photoImage}
            />
            <Text style={styles.photoLabel}>双摄合照</Text>
          </View>
        )}
        <View style={styles.photoPair}>
          <PhotoMock label="后置" filePath={photos.rear} />
          <PhotoMock label="前置" filePath={photos.front} />
        </View>
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.secondaryAction} onPress={onClose}>
            <Text style={styles.actionText}>重拍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryAction} onPress={onClose}>
            <Text style={styles.actionText}>完成</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
)

export const GalleryModal = ({
  visible,
  assets,
  loading,
  onClose,
}: {
  visible: boolean
  assets: GalleryAsset[]
  loading: boolean
  onClose: () => void
}) => {
  const { width: windowWidth } = useWindowDimensions()
  const [filter, setFilter] = useState<GalleryFilter>('all')
  const [viewMode, setViewMode] = useState<GalleryViewMode>('grid')
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [sharing, setSharing] = useState(false)

  const filteredAssets = useMemo(
    () =>
      assets.filter(asset => {
        const isVideo = isVideoAsset(asset)
        if (filter === 'video') return isVideo
        if (filter === 'dualPhoto') return asset.kind === 'dualPhoto'
        return true
      }),
    [assets, filter],
  )

  useEffect(() => {
    if (!visible) {
      setSelectedAssetIds([])
      setSharing(false)
    }
  }, [visible])

  useEffect(() => {
    const visibleAssetIds = new Set(filteredAssets.map(asset => asset.id))
    setSelectedAssetIds(previous =>
      previous.filter(id => visibleAssetIds.has(id)),
    )
  }, [filteredAssets])

  const selectedAssets = useMemo(
    () => filteredAssets.filter(asset => selectedAssetIds.includes(asset.id)),
    [filteredAssets, selectedAssetIds],
  )

  const selectedCount = selectedAssetIds.length
  const hasSelectedAssets = selectedCount > 0

  const toggleSelectedAsset = (assetId: string) => {
    setSelectedAssetIds(previous =>
      previous.includes(assetId)
        ? previous.filter(id => id !== assetId)
        : [...previous, assetId],
    )
  }

  const toggleViewMode = () => {
    setViewMode(previous => (previous === 'grid' ? 'large' : 'grid'))
  }

  const renderSelectedOverlay = (assetId: string) =>
    selectedAssetIds.includes(assetId) ? (
      <View style={styles.selectedOverlay}>
        <View style={styles.selectedCheck}>
          <Text style={styles.selectedCheckText}>✓</Text>
        </View>
      </View>
    ) : null

  const shareSelectedAssets = async () => {
    if (selectedAssets.length === 0 || sharing) return

    try {
      setSharing(true)
      const shareableFiles = await Promise.all(
        selectedAssets.map((asset, index) =>
          prepareShareableAssetFile(asset, index),
        ),
      )
      const shareType = shareableFiles.every(
        file => file.mimeType === shareableFiles[0].mimeType,
      )
        ? shareableFiles[0].mimeType
        : 'application/octet-stream'
      await Share.open(
        shareableFiles.length === 1
          ? {
              url: shareableFiles[0].url,
              filename: shareableFiles[0].filename,
              type: shareType,
              failOnCancel: false,
            }
          : {
              urls: shareableFiles.map(file => file.url),
              filenames: shareableFiles.map(file => file.filename),
              type: shareType,
              failOnCancel: false,
            },
      )
    } catch (error) {
      console.warn('Share gallery assets failed', error)
    } finally {
      setSharing(false)
    }
  }

  const emptyText =
    filter === 'video'
      ? '暂无视频'
      : filter === 'dualPhoto'
      ? '暂无双摄照片'
      : '暂无照片'

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.galleryRoot}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>相册</Text>
            {hasSelectedAssets && (
              <Text style={styles.selectionHint}>
                已选择 {selectedCount} 项
              </Text>
            )}
          </View>
          {hasSelectedAssets ? (
            <View style={styles.galleryHeaderActions}>
              <TouchableOpacity
                style={styles.galleryHeaderButton}
                onPress={() => setSelectedAssetIds([])}
              >
                <Text style={styles.galleryHeaderButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  sharing && styles.shareButtonDisabled,
                ]}
                activeOpacity={0.84}
                onPress={shareSelectedAssets}
                disabled={sharing}
              >
                <Text style={styles.shareButtonText}>
                  {sharing ? '分享中' : '分享'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.galleryHeaderActions}>
              <TouchableOpacity
                style={styles.galleryIconButton}
                activeOpacity={0.84}
                onPress={toggleViewMode}
              >
                <MaterialIcons
                  name={viewMode === 'grid' ? 'view-agenda' : 'grid-view'}
                  color="rgba(255,255,255,0.9)"
                  size={23}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                <Text style={styles.iconText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.filterTabs}>
          {galleryFilters.map(item => {
            const active = filter === item.id
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterTab, active && styles.filterTabActive]}
                activeOpacity={0.82}
                onPress={() => setFilter(item.id)}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        {loading ? (
          <View style={styles.emptyGallery}>
            <Text style={styles.emptyText}>正在读取相册</Text>
          </View>
        ) : filteredAssets.length === 0 ? (
          <View style={styles.emptyGallery}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : viewMode === 'grid' ? (
          <ScrollView contentContainerStyle={styles.galleryGrid}>
            {filteredAssets.map(asset => (
              <TouchableOpacity
                key={asset.id}
                style={styles.galleryTile}
                activeOpacity={0.86}
                onPress={() => toggleSelectedAsset(asset.id)}
              >
                <Image
                  source={{ uri: asset.uri }}
                  style={styles.galleryImage}
                />
                <Text style={styles.dualBadge}>
                  {getGalleryAssetLabel(asset)}
                </Text>
                {renderSelectedOverlay(asset.id)}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryLargePager}
          >
            {filteredAssets.map(asset => (
              <TouchableOpacity
                key={asset.id}
                style={[styles.galleryLargePage, { width: windowWidth }]}
                activeOpacity={0.9}
                onPress={() => toggleSelectedAsset(asset.id)}
              >
                <View style={styles.galleryLargeItem}>
                  <Image
                    source={{ uri: asset.uri }}
                    style={styles.galleryLargeImage}
                    resizeMode="cover"
                  />
                  <View style={styles.largeMetaBar}>
                    <Text style={styles.largeMetaText}>
                      {getGalleryAssetLabel(asset)}
                    </Text>
                    {asset.filename && (
                      <Text style={styles.largeFileName} numberOfLines={1}>
                        {asset.filename}
                      </Text>
                    )}
                  </View>
                  {renderSelectedOverlay(asset.id)}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const PhotoMock = ({
  label,
  filePath,
}: {
  label: string
  filePath?: string
}) => (
  <View style={styles.photoMock}>
    {filePath ? (
      <Image source={{ uri: filePath }} style={styles.photoImage} />
    ) : (
      <CameraTexture />
    )}
    <Text style={styles.photoLabel}>{label}</Text>
    {filePath && <Text style={styles.photoPath}>{filePath}</Text>}
  </View>
)

const CameraTexture = ({ compact }: { compact?: boolean }) => (
  <View style={[styles.texture, compact && styles.textureCompact]}>
    <View style={styles.neonLine} />
    <View style={[styles.neonLine, styles.neonLineTwo]} />
    <View style={styles.lightBand} />
  </View>
)

const styles = StyleSheet.create({
  texture: { ...StyleSheet.absoluteFillObject, backgroundColor: '#06090a' },
  textureCompact: { borderRadius: 22 },
  neonLine: {
    position: 'absolute',
    top: '18%',
    left: '8%',
    width: '88%',
    height: 2,
    backgroundColor: 'rgba(92, 255, 219, 0.55)',
    transform: [{ rotate: '-18deg' }],
  },
  neonLineTwo: {
    top: '34%',
    left: '28%',
    width: '62%',
    backgroundColor: 'rgba(80, 200, 255, 0.4)',
    transform: [{ rotate: '72deg' }],
  },
  lightBand: {
    position: 'absolute',
    top: '38%',
    left: '-10%',
    width: '120%',
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-2deg' }],
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.78)',
    padding: 18,
  },
  previewCard: {
    borderRadius: 26,
    padding: 18,
    backgroundColor: '#111318',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '400' },
  selectionHint: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
  captureMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 8,
  },
  combinedPreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#080b0c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginTop: 18,
  },
  photoPair: { flexDirection: 'row', gap: 12, marginTop: 18 },
  photoMock: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#080b0c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  photoImage: { width: '100%', height: '100%' },
  photoLabel: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
  },
  photoPath: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    fontWeight: '400',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  secondaryAction: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  primaryAction: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0,212,255,0.32)',
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '400' },
  galleryRoot: { flex: 1, backgroundColor: '#08090c' },
  modalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconText: { color: '#fff', fontSize: 22, fontWeight: '400' },
  closeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  galleryHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  galleryHeaderButton: {
    minWidth: 58,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  galleryHeaderButtonText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    fontWeight: '400',
  },
  galleryIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shareButton: {
    minWidth: 66,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  shareButtonDisabled: {
    opacity: 0.58,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  filterText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '400',
  },
  filterTextActive: {
    color: '#fff',
  },
  emptyGallery: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 15,
    fontWeight: '400',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 4,
    paddingBottom: 24,
  },
  galleryLargePager: {
    flexGrow: 1,
  },
  galleryTile: {
    width: '32.6%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  galleryImage: { width: '100%', height: '100%' },
  galleryLargePage: {
    flex: 1,
    paddingBottom: 18,
  },
  galleryLargeItem: {
    flex: 1,
    backgroundColor: '#050607',
    position: 'relative',
  },
  galleryLargeImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#050607',
  },
  largeMetaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  largeMetaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '400',
  },
  largeFileName: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 3,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.88)',
  },
  selectedCheck: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  selectedCheckText: {
    color: '#08090c',
    fontSize: 15,
    fontWeight: '400',
  },
  dualBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    color: '#fff',
    fontSize: 11,
    fontWeight: '400',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  menuArrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 24,
    fontWeight: '400',
  },
})
