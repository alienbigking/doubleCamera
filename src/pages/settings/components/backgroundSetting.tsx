import React, { useState, useCallback, useRef, useEffect, memo } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { captureRef } from 'react-native-view-shot'
import RNFS from 'react-native-fs'
import LinearGradient from 'react-native-linear-gradient'
import { SvgXml } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { deleteBackgroundImage } from '@/components/homeBackground/services/backgroundGeneratorService'
import { PRESET_LAYOUT } from '@/components/homeBackground/presetLayout'
import { useSettingsStore } from '../stores'

const MIN_SVG_COUNT = 5
const MAX_SVG_COUNT = 30
const DEFAULT_SVG_COUNT = 20
const OUTPUT_FILENAME = 'home_background.png'
const BATCH_SIZE = 10
const BATCH_INTERVAL = 32

// 缓存已加载的 SVG 字符串，Modal 关闭后不丢失
let svgCache: string[] = []

const loadSvgsOnce = (count: number): string[] => {
  if (svgCache.length >= count) {
    return svgCache.slice(0, count)
  }
  const SvgData = require('@/components/homeBackground/svgData')
  svgCache = (Object.values(SvgData) as string[])
    .filter(
      v =>
        typeof v === 'string' && !v.includes('NaN') && !v.includes('undefined'),
    )
    .slice(0, MAX_SVG_COUNT)
  return svgCache.slice(0, count)
}

// ── 预览画布：分批渲染 SVG 图标 ────────────────────────────────
interface PreviewCanvasProps {
  svgs: string[]
  width: number
  height: number
}

const PreviewCanvas = memo<PreviewCanvasProps>(({ svgs, width, height }) => {
  const scale = width / 375
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    setVisibleCount(0)
    const timer = setInterval(() => {
      setVisibleCount(v => {
        const next = v + BATCH_SIZE
        if (next >= PRESET_LAYOUT.length) {
          clearInterval(timer)
          return PRESET_LAYOUT.length
        }
        return next
      })
    }, BATCH_INTERVAL)
    return () => clearInterval(timer)
  }, [svgs])

  return (
    <View
      style={[styles.canvas, styles.canvasOverflow, { width, height }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['#CFF5D2', '#A8E6B3', '#7FD89B']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {PRESET_LAYOUT.slice(0, visibleCount).map((item, i) => {
        const xml = svgs[item.svgIndex % (svgs.length || 1)]
        if (!xml) {
          return null
        }
        return (
          <View
            key={i}
            style={[
              styles.iconAbsolute,
              {
                left: item.x * scale,
                top: item.y * scale,
                width: item.size * scale,
                height: item.size * scale,
                opacity: item.opacity,
                transform: [{ rotate: `${item.rotate}deg` }],
              },
            ]}
          >
            <SvgXml
              xml={xml}
              width={item.size * scale}
              height={item.size * scale}
            />
          </View>
        )
      })}
      <View style={[StyleSheet.absoluteFillObject, styles.glowOverlay]} />
    </View>
  )
})

// ── Modal 内容（懒加载，visible=true 时才 mount） ────────────────
interface BackgroundModalContentProps {
  onClose: () => void
}

const BackgroundModalContent: React.FC<BackgroundModalContentProps> = ({
  onClose,
}) => {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const previewWidth = width - 48
  const previewHeight = Math.round(previewWidth * (812 / 375))

  const setHomeBackgroundImagePath = useSettingsStore(
    s => s.setHomeBackgroundImagePath,
  )
  const homeBackgroundImagePath = useSettingsStore(
    s => s.homeBackgroundImagePath,
  )

  const [svgCount, setSvgCount] = useState(DEFAULT_SVG_COUNT)
  const [pendingCount, setPendingCount] = useState(DEFAULT_SVG_COUNT)
  const [svgs, setSvgs] = useState<string[]>([])
  const [svgsReady, setSvgsReady] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewUri, setPreviewUri] = useState<string | null>(
    homeBackgroundImagePath ? `file://${homeBackgroundImagePath}` : null,
  )
  const [error, setError] = useState<string | null>(null)
  const captureViewRef = useRef<View>(null)

  // Modal 打开后延迟一帧加载 SVG，不阻塞动画（仅 mount 时执行一次，svgCount 初始值已固定）

  useEffect(() => {
    const t = setTimeout(() => {
      setSvgs(loadSvgsOnce(svgCount))
      setSvgsReady(true)
    }, 100)
    return () => clearTimeout(t)
  }, [svgCount])

  // 滑块松手后再更新 SVG
  const handleSlidingComplete = useCallback((val: number) => {
    const count = Math.round(val)
    setSvgCount(count)
    setSvgsReady(false)
    const t = setTimeout(() => {
      setSvgs(loadSvgsOnce(count))
      setSvgsReady(true)
    }, 50)
    return () => clearTimeout(t)
  }, [])

  // 离屏截图 View（固定 375×812）
  const captureView = (
    <View ref={captureViewRef} style={styles.offscreen} collapsable={false}>
      <LinearGradient
        colors={['#CFF5D2', '#A8E6B3', '#7FD89B']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {svgs.length > 0 &&
        PRESET_LAYOUT.map((item, i) => {
          const xml = svgs[item.svgIndex % svgs.length]
          if (!xml) {
            return null
          }
          return (
            <View
              key={i}
              style={[
                styles.iconAbsolute,
                {
                  left: item.x,
                  top: item.y,
                  width: item.size,
                  height: item.size,
                  opacity: item.opacity,
                  transform: [{ rotate: `${item.rotate}deg` }],
                },
              ]}
            >
              <SvgXml xml={xml} width={item.size} height={item.size} />
            </View>
          )
        })}
      <View style={[StyleSheet.absoluteFillObject, styles.glowOverlay]} />
    </View>
  )

  const handleGenerate = useCallback(async () => {
    if (!captureViewRef.current) {
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const uri = await captureRef(captureViewRef, {
        format: 'png',
        quality: 1,
        width: 375,
        height: 812,
      })
      const destPath = `${RNFS.DocumentDirectoryPath}/${OUTPUT_FILENAME}`
      await RNFS.copyFile(uri, destPath)
      setPreviewUri(`file://${destPath}?t=${Date.now()}`)
      setHomeBackgroundImagePath(destPath)
    } catch (e: any) {
      console.error('[BackgroundModal] generate error:', e)
      setError(e?.message || '生成失败')
    } finally {
      setGenerating(false)
    }
  }, [setHomeBackgroundImagePath])

  const handleReset = useCallback(async () => {
    await deleteBackgroundImage()
    setHomeBackgroundImagePath(null)
    setPreviewUri(null)
  }, [setHomeBackgroundImagePath])

  return (
    <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
      {captureView}

      {/* 顶栏 */}
      <View style={styles.modalHeader}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.modalCloseBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.modalCloseText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>自定义首页背景</Text>
        <View style={styles.modalHeaderRight} />
      </View>

      <ScrollView
        style={styles.modalScroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 预览区 */}
        <View
          style={[
            styles.preview,
            { width: previewWidth, height: previewHeight },
          ]}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : svgsReady ? (
            <PreviewCanvas
              svgs={svgs}
              width={previewWidth}
              height={previewHeight}
            />
          ) : (
            <View style={styles.previewLoading}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.previewLoadingText}>加载中...</Text>
            </View>
          )}
          {generating && (
            <View style={styles.generatingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.generatingText}>正在生成...</Text>
            </View>
          )}
        </View>

        {/* 滑块 */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>SVG 种类</Text>
            <Text style={styles.sliderValue}>{pendingCount}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={MIN_SVG_COUNT}
            maximumValue={MAX_SVG_COUNT}
            step={1}
            value={pendingCount}
            onValueChange={v => setPendingCount(Math.round(v))}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor="#4CAF50"
            maximumTrackTintColor="#e0e0e0"
            thumbTintColor="#4CAF50"
          />
          <View style={styles.sliderHint}>
            <Text style={styles.hintText}>少（{MIN_SVG_COUNT}）</Text>
            <Text style={styles.hintText}>多（{MAX_SVG_COUNT}）</Text>
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* 按钮 */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnGenerate,
              (generating || !svgsReady) && styles.btnDisabled,
            ]}
            onPress={handleGenerate}
            disabled={generating || !svgsReady}
            activeOpacity={0.8}
          >
            <Text style={styles.btnGenerateText}>
              {generating ? '生成中...' : '生成并应用'}
            </Text>
          </TouchableOpacity>
          {homeBackgroundImagePath && (
            <TouchableOpacity
              style={[styles.btn, styles.btnReset]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.btnResetText}>恢复默认</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// ── 入口行（settings 页显示，点击弹 Modal） ─────────────────────
const BackgroundSetting: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const homeBackgroundImagePath = useSettingsStore(
    s => s.homeBackgroundImagePath,
  )

  return (
    <>
      <Text style={styles.sectionTitle}>首页背景图</Text>
      <Text style={styles.entryDesc}>
        {homeBackgroundImagePath ? '已使用自定义背景图' : '使用默认背景图'}
      </Text>
      <TouchableOpacity
        style={styles.entryRow}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.entryRowText}>自定义背景图</Text>
        <Text style={styles.entryRowArrow}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        {modalVisible && (
          <BackgroundModalContent onClose={() => setModalVisible(false)} />
        )}
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  entryDesc: { fontSize: 12, color: '#888', marginBottom: 8 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  entryRowText: { fontSize: 14, color: '#333', fontWeight: '500' },
  entryRowArrow: { fontSize: 18, color: '#ccc' },
  modalContainer: { flex: 1, backgroundColor: '#F7F7F7' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 16, color: '#999' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  modalHeaderRight: { width: 36 },
  modalScroll: { flex: 1, paddingHorizontal: 24 },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    width: 375,
    height: 812,
    overflow: 'hidden',
  },
  canvas: { borderRadius: 0 },
  canvasOverflow: { overflow: 'hidden' },
  iconAbsolute: { position: 'absolute' },
  glowOverlay: { backgroundColor: 'rgba(255,255,255,0.18)' },
  preview: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#eee',
    marginTop: 20,
    alignSelf: 'center',
  },
  previewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewLoadingText: { fontSize: 12, color: '#aaa' },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  generatingText: { color: '#fff', fontSize: 14 },
  sliderSection: { marginTop: 20, gap: 4 },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: { fontSize: 13, color: '#555' },
  sliderValue: { fontSize: 16, fontWeight: '700', color: '#4CAF50' },
  slider: { width: '100%', marginVertical: 2 },
  sliderHint: { flexDirection: 'row', justifyContent: 'space-between' },
  hintText: { fontSize: 11, color: '#aaa' },
  errorText: { fontSize: 12, color: '#E84C5F', marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnGenerate: { backgroundColor: '#4CAF50' },
  btnDisabled: { opacity: 0.5 },
  btnGenerateText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnReset: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  btnResetText: { color: '#888', fontWeight: '600', fontSize: 14 },
})

export default BackgroundSetting
