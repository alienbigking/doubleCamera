import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type GalleryAssetKind } from './galleryAssetIndex'
import { CameraRoll } from '@react-native-camera-roll/camera-roll'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'
import Video from 'react-native-video'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Alert,
  Animated,
  ActivityIndicator,
  Easing,
  Image,
  Modal,
  PanResponder,
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
  width?: number
  height?: number
  fileSize?: number | null
  playableDuration?: number
  timestamp?: number
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

const formatFileSize = (fileSize?: number | null) => {
  if (!fileSize) return '大小未知'
  if (fileSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSize / 1024))} KB`
  }
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
}

const formatDuration = (duration?: number) => {
  if (!duration) return '时长未知'
  const totalSeconds = Math.round(duration)
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(
    2,
    '0',
  )}`
}

const formatAssetDate = (timestamp?: number) => {
  if (!timestamp) return '时间未知'
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  onDelete,
}: {
  visible: boolean
  assets: GalleryAsset[]
  loading: boolean
  onClose: () => void
  onDelete: (assets: GalleryAsset[]) => Promise<void>
}) => {
  const { width: windowWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [filter, setFilter] = useState<GalleryFilter>('all')
  const [viewMode, setViewMode] = useState<GalleryViewMode>('grid')
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [focusedAssetIndex, setFocusedAssetIndex] = useState(0)
  const [playingVideoId, setPlayingVideoId] = useState<string>()
  const [assetInfoVisible, setAssetInfoVisible] = useState(false)
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 })
  const previewOpacity = useRef(new Animated.Value(1)).current
  const previewBackdropOpacity = useRef(new Animated.Value(1)).current
  const assetInfoProgress = useRef(new Animated.Value(0)).current
  const previewScale = useRef(new Animated.Value(1)).current
  const previewTranslateX = useRef(new Animated.Value(0)).current
  const previewTranslateY = useRef(new Animated.Value(0)).current
  const contentRef = useRef<View | null>(null)
  const tileRefs = useRef<Record<string, View | null>>({})

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
      setDeleting(false)
      setSelectionMode(false)
      setFocusedAssetIndex(0)
      setPlayingVideoId(undefined)
      setAssetInfoVisible(false)
      setViewMode('grid')
      previewOpacity.setValue(1)
      previewBackdropOpacity.setValue(1)
      assetInfoProgress.setValue(0)
      previewScale.setValue(1)
      previewTranslateX.setValue(0)
      previewTranslateY.setValue(0)
    }
  }, [
    previewOpacity,
    previewBackdropOpacity,
    assetInfoProgress,
    previewScale,
    previewTranslateX,
    previewTranslateY,
    visible,
  ])

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

  const animateToGrid = useCallback(() => {
    setPlayingVideoId(undefined)
    setAssetInfoVisible(false)
    assetInfoProgress.setValue(0)
    const tile = tileRefs.current[filteredAssets[focusedAssetIndex]?.id]
    const animate = (targetX: number, targetY: number, targetScale: number) =>
      Animated.parallel([
        Animated.timing(previewScale, {
          toValue: targetScale,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(previewTranslateX, {
          toValue: targetX,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(previewTranslateY, {
          toValue: targetY,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(previewOpacity, {
          toValue: 0,
          duration: 190,
          useNativeDriver: true,
        }),
        Animated.timing(previewBackdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setViewMode('grid')
      })

    if (!tile || !contentRef.current || contentSize.width === 0) {
      animate(0, 48, 0.86)
      return
    }

    tile.measureInWindow((tileX, tileY, tileWidth, tileHeight) => {
      contentRef.current?.measureInWindow((contentX, contentY) => {
        const scale = Math.max(
          0.08,
          Math.min(
            tileWidth / contentSize.width,
            tileHeight / contentSize.height,
          ),
        )
        const targetX =
          tileX - contentX - (contentSize.width - contentSize.width * scale) / 2
        const targetY =
          tileY -
          contentY -
          (contentSize.height - contentSize.height * scale) / 2
        animate(targetX, targetY, scale)
      })
    })
  }, [
    contentSize,
    filteredAssets,
    focusedAssetIndex,
    assetInfoProgress,
    previewOpacity,
    previewBackdropOpacity,
    previewScale,
    previewTranslateX,
    previewTranslateY,
  ])

  const toggleViewMode = () => {
    if (viewMode === 'large') {
      animateToGrid()
      return
    }

    previewTranslateY.setValue(0)
    assetInfoProgress.setValue(0)
    setAssetInfoVisible(false)
    previewTranslateX.setValue(0)
    previewScale.setValue(0.94)
    previewOpacity.setValue(0.35)
    setViewMode('large')
    Animated.parallel([
      Animated.spring(previewScale, {
        toValue: 1,
        damping: 19,
        stiffness: 210,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(previewOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const previewPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          viewMode === 'large' &&
          Math.abs(gesture.dy) > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy < 0) {
            assetInfoProgress.setValue(Math.min(-gesture.dy / 180, 1))
            return
          }
          if (assetInfoVisible) {
            assetInfoProgress.setValue(Math.max(0, 1 - gesture.dy / 180))
            return
          }
          const distance = Math.max(0, gesture.dy)
          previewTranslateY.setValue(distance * 0.55)
          previewScale.setValue(1 - Math.min(distance / 700, 0.16))
          previewOpacity.setValue(1 - Math.min(distance / 500, 0.35))
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -50) {
            setAssetInfoVisible(true)
            Animated.spring(assetInfoProgress, {
              toValue: 1,
              damping: 22,
              stiffness: 210,
              useNativeDriver: true,
            }).start()
            return
          }
          if (assetInfoVisible && gesture.dy > 35) {
            setAssetInfoVisible(false)
            Animated.spring(assetInfoProgress, {
              toValue: 0,
              damping: 22,
              stiffness: 210,
              useNativeDriver: true,
            }).start()
            return
          }
          if (gesture.dy > 90 || gesture.vy > 0.65) {
            animateToGrid()
            return
          }

          Animated.parallel([
            Animated.spring(previewTranslateY, {
              toValue: 0,
              damping: 20,
              stiffness: 220,
              useNativeDriver: true,
            }),
            Animated.spring(previewScale, {
              toValue: 1,
              damping: 20,
              stiffness: 220,
              useNativeDriver: true,
            }),
            Animated.spring(previewOpacity, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start()
        },
        onPanResponderTerminate: () => {
          Animated.spring(assetInfoProgress, {
            toValue: assetInfoVisible ? 1 : 0,
            useNativeDriver: true,
          }).start()
          Animated.parallel([
            Animated.spring(previewTranslateY, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(previewScale, {
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.spring(previewOpacity, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start()
        },
      }),
    [
      animateToGrid,
      assetInfoProgress,
      assetInfoVisible,
      previewOpacity,
      previewScale,
      previewTranslateY,
      viewMode,
    ],
  )

  const openAssetPreview = (assetId: string) => {
    const index = filteredAssets.findIndex(asset => asset.id === assetId)
    setFocusedAssetIndex(Math.max(index, 0))
    if (viewMode === 'large') return

    const open = (startX: number, startY: number, startScale: number) => {
      previewTranslateX.setValue(startX)
      previewTranslateY.setValue(startY)
      previewScale.setValue(startScale)
      previewOpacity.setValue(1)
      previewBackdropOpacity.setValue(0)
      assetInfoProgress.setValue(0)
      setAssetInfoVisible(false)
      setViewMode('large')
      Animated.parallel([
        Animated.timing(previewTranslateX, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(previewTranslateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(previewScale, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(previewBackdropOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start()
    }

    const tile = tileRefs.current[assetId]
    if (!tile || !contentRef.current || contentSize.width === 0) {
      open(0, 0, 0.94)
      return
    }

    tile.measureInWindow((tileX, tileY, tileWidth, tileHeight) => {
      contentRef.current?.measureInWindow((contentX, contentY) => {
        const startScale = Math.max(
          0.08,
          Math.min(
            tileWidth / contentSize.width,
            tileHeight / contentSize.height,
          ),
        )
        open(
          tileX -
            contentX -
            (contentSize.width - contentSize.width * startScale) / 2,
          tileY -
            contentY -
            (contentSize.height - contentSize.height * startScale) / 2,
          startScale,
        )
      })
    })
  }

  const enterSelectionMode = () => {
    setSelectionMode(true)
  }

  const leaveSelectionMode = () => {
    setSelectionMode(false)
    setSelectedAssetIds([])
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
      console.warn('分享相册内容失败', error)
    } finally {
      setSharing(false)
    }
  }

  const deleteSelectedAssets = () => {
    if (selectedAssets.length === 0 || sharing || deleting) return

    Alert.alert(
      '删除内容',
      `确定删除选中的 ${selectedAssets.length} 项吗？删除后将从系统相册移除。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true)
              await onDelete(selectedAssets)
              setSelectedAssetIds([])
            } catch (error) {
              console.warn('删除相册内容失败', error)
            } finally {
              setDeleting(false)
            }
          },
        },
      ],
    )
  }

  const focusedAsset = filteredAssets[focusedAssetIndex]
  const renderAssetInfo = (asset: GalleryAsset) => (
    <Animated.View
      pointerEvents={assetInfoVisible ? 'auto' : 'none'}
      style={[
        styles.assetInfoPanel,
        {
          opacity: assetInfoProgress,
          transform: [
            {
              translateY: assetInfoProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [260, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.assetInfoGrabber} />
      <Text style={styles.assetInfoTitle}>{getGalleryAssetLabel(asset)}</Text>
      <Text style={styles.assetInfoDate}>
        {formatAssetDate(asset.timestamp)}
      </Text>
      <View style={styles.assetInfoRows}>
        <Text style={styles.assetInfoText}>
          {asset.width && asset.height
            ? `${asset.width} × ${asset.height}`
            : '尺寸未知'}
        </Text>
        <Text style={styles.assetInfoText}>
          {isVideoAsset(asset)
            ? formatDuration(asset.playableDuration)
            : formatFileSize(asset.fileSize)}
        </Text>
        <Text style={styles.assetInfoText}>
          {asset.filename || getShareFileName(asset, focusedAssetIndex)}
        </Text>
      </View>
    </Animated.View>
  )

  const emptyText =
    filter === 'video'
      ? '暂无视频'
      : filter === 'dualPhoto'
      ? '暂无双摄照片'
      : '暂无照片'

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
    >
      <View
        style={[
          styles.galleryRoot,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.galleryTitle}>相册</Text>
            <Text
              style={[
                styles.selectionHint,
                !hasSelectedAssets && styles.selectionHintPlaceholder,
              ]}
            >
              {hasSelectedAssets ? `已选择 ${selectedCount} 项` : '占位'}
            </Text>
          </View>
          {selectionMode ? (
            <View style={styles.galleryHeaderActions}>
              <TouchableOpacity
                style={styles.galleryHeaderButton}
                onPress={leaveSelectionMode}
              >
                <Text style={styles.galleryHeaderButtonText}>取消</Text>
              </TouchableOpacity>
              {hasSelectedAssets && (
                <TouchableOpacity
                  style={[
                    styles.shareButton,
                    (sharing || deleting) && styles.shareButtonDisabled,
                  ]}
                  activeOpacity={0.84}
                  onPress={shareSelectedAssets}
                  disabled={sharing || deleting}
                >
                  <Text style={styles.shareButtonText}>
                    {sharing ? '分享中' : '分享'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.galleryHeaderActions}>
              {viewMode === 'large' && (
                <TouchableOpacity
                  style={styles.galleryHeaderButton}
                  activeOpacity={0.84}
                  onPress={enterSelectionMode}
                >
                  <Text style={styles.galleryHeaderButtonText}>选择</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.galleryIconButton}
                activeOpacity={0.84}
                onPress={toggleViewMode}
                accessibilityLabel={
                  viewMode === 'grid' ? '查看大图' : '查看网格'
                }
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
        <View
          ref={contentRef}
          onLayout={event => {
            const { width, height } = event.nativeEvent.layout
            setContentSize({ width, height })
          }}
          style={styles.galleryContent}
        >
          {loading ? (
            <View style={styles.emptyGallery}>
              <ActivityIndicator color="rgba(255,255,255,0.82)" size="small" />
              <Text style={styles.loadingText}>正在加载</Text>
            </View>
          ) : filteredAssets.length === 0 ? (
            <View style={styles.emptyGallery}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.galleryGrid}>
              {filteredAssets.map(asset => (
                <TouchableOpacity
                  key={asset.id}
                  ref={node => {
                    tileRefs.current[asset.id] = node
                  }}
                  style={styles.galleryTile}
                  activeOpacity={0.86}
                  onPress={() => {
                    if (selectionMode) {
                      toggleSelectedAsset(asset.id)
                    } else {
                      openAssetPreview(asset.id)
                    }
                  }}
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
          )}
          {viewMode === 'large' && filteredAssets.length > 0 && (
            <Animated.View
              {...previewPanResponder.panHandlers}
              style={[
                styles.galleryLargeOverlay,
                {
                  opacity: previewOpacity,
                  transform: [
                    { scale: previewScale },
                    { translateX: previewTranslateX },
                    { translateY: previewTranslateY },
                  ],
                },
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.galleryLargeBackdrop,
                  { opacity: previewBackdropOpacity },
                ]}
              />
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: focusedAssetIndex * windowWidth, y: 0 }}
                onMomentumScrollEnd={event => {
                  const nextIndex = Math.round(
                    event.nativeEvent.contentOffset.x / windowWidth,
                  )
                  setFocusedAssetIndex(nextIndex)
                  setPlayingVideoId(undefined)
                  setAssetInfoVisible(false)
                  Animated.timing(assetInfoProgress, {
                    toValue: 0,
                    duration: 140,
                    useNativeDriver: true,
                  }).start()
                }}
                contentContainerStyle={styles.galleryLargePager}
              >
                {filteredAssets.map(asset => (
                  <View
                    key={asset.id}
                    style={[styles.galleryLargePage, { width: windowWidth }]}
                  >
                    <TouchableOpacity
                      style={styles.galleryLargeTouch}
                      activeOpacity={0.96}
                      onPress={() => {
                        if (selectionMode) toggleSelectedAsset(asset.id)
                      }}
                    >
                      <View style={styles.galleryLargeItem}>
                        {isVideoAsset(asset) ? (
                          <Video
                            source={{ uri: asset.uri }}
                            style={styles.galleryLargeImage}
                            resizeMode="contain"
                            paused={playingVideoId !== asset.id}
                            controls
                            playInBackground={false}
                            playWhenInactive={false}
                            onEnd={() => setPlayingVideoId(undefined)}
                          />
                        ) : (
                          <Image
                            source={{ uri: asset.uri }}
                            style={styles.galleryLargeImage}
                            resizeMode="cover"
                          />
                        )}
                        {isVideoAsset(asset) && playingVideoId !== asset.id && (
                          <TouchableOpacity
                            style={styles.videoPlayButton}
                            activeOpacity={0.82}
                            onPress={() => setPlayingVideoId(asset.id)}
                            accessibilityLabel="播放视频"
                          >
                            <MaterialIcons
                              name="play-arrow"
                              color="#fff"
                              size={36}
                            />
                          </TouchableOpacity>
                        )}
                        {renderSelectedOverlay(asset.id)}
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              {focusedAsset && renderAssetInfo(focusedAsset)}
            </Animated.View>
          )}
        </View>
        {selectionMode && (
          <View style={styles.selectedActionBar}>
            <TouchableOpacity
              style={[
                styles.deleteAction,
                !hasSelectedAssets && styles.selectedActionDisabled,
              ]}
              activeOpacity={0.82}
              onPress={deleteSelectedAssets}
              disabled={!hasSelectedAssets || deleting || sharing}
              accessibilityLabel="删除选中内容"
            >
              <MaterialIcons
                name="delete-outline"
                color="rgba(255,112,112,0.98)"
                size={22}
              />
              <Text style={styles.deleteActionText}>
                {deleting ? '删除中' : '删除'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  galleryTitle: { color: '#fff', fontSize: 25, fontWeight: '600' },
  selectionHint: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
    height: 15,
    lineHeight: 15,
  },
  selectionHintPlaceholder: {
    opacity: 0,
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
  galleryRoot: {
    flex: 1,
    backgroundColor: '#08090c',
  },
  galleryContent: {
    flex: 1,
    overflow: 'hidden',
  },
  galleryLargeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  galleryLargeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#08090c',
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
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
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
  loadingText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    marginTop: 12,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 28,
  },
  galleryLargePager: {
    flexGrow: 1,
  },
  selectedActionBar: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(14,15,20,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    minWidth: 132,
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,76,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,112,112,0.22)',
  },
  deleteActionText: {
    color: 'rgba(255,140,140,0.98)',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedActionDisabled: {
    opacity: 0.42,
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
  galleryLargeTouch: {
    flex: 1,
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
  assetInfoPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 184,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: 'rgba(20,21,26,0.96)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  assetInfoGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  assetInfoTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  assetInfoDate: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    marginTop: 4,
  },
  assetInfoRows: {
    marginTop: 16,
    gap: 8,
  },
  assetInfoText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
  },
  videoPlayButton: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 64,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
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
