import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type CaptureMode = 'photo' | 'video'
type LayoutMode = 'pip' | 'split'
type Panel = 'menu' | 'quick' | null

const zooms = ['0.5x', '1x', '2x', '3x']
const ratios = ['4:3', '16:9', '1:1', '9:16']

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(
    2,
    '0',
  )}`
}

const DualCamera = () => {
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<CaptureMode>('photo')
  const [layout, setLayout] = useState<LayoutMode>('pip')
  const [panel, setPanel] = useState<Panel>(null)
  const [zoom, setZoom] = useState('1x')
  const [ratio, setRatio] = useState('16:9')
  const [primaryCamera, setPrimaryCamera] = useState<'rear' | 'front'>('rear')
  const [showTopBar, setShowTopBar] = useState(true)
  const [showBottomBar, setShowBottomBar] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [proMode, setProMode] = useState(false)

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      setRecordingSeconds(value => value + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [recording])

  const secondaryCamera = primaryCamera === 'rear' ? 'front' : 'rear'
  const isPip = layout === 'pip'
  const layoutLabel = layout === 'pip' ? '画中画' : '上下分屏'
  const primaryLabel = primaryCamera === 'rear' ? '后置主画面' : '前置主画面'
  const secondaryLabel = secondaryCamera === 'rear' ? '后置预览' : '前置预览'

  const topVisible = showTopBar || panel !== null
  const bottomVisible = showBottomBar || panel !== null

  const captureHint = useMemo(() => {
    if (recording) return `REC ${formatDuration(recordingSeconds)}`
    return mode === 'photo' ? '双路拍照待命' : '双路录制待命'
  }, [mode, recording, recordingSeconds])

  const closeFloatingPanels = () => {
    if (panel) setPanel(null)
  }

  const handleShutter = () => {
    setPanel(null)
    if (mode === 'photo') {
      setPreviewOpen(true)
      return
    }
    setRecording(value => {
      if (value) {
        setRecordingSeconds(0)
      }
      return !value
    })
  }

  const openMenuItem = (action: 'gallery' | 'settings' | 'pro') => {
    setPanel(null)
    if (action === 'gallery') setGalleryOpen(true)
    if (action === 'settings') setSettingsOpen(true)
    if (action === 'pro') setProMode(value => !value)
  }

  return (
    <View style={styles.root}>
      <Pressable style={styles.preview} onPress={closeFloatingPanels}>
        {layout === 'split' ? (
          <>
            <CameraPane label={primaryLabel} />
            <View style={styles.splitDivider} />
            <CameraPane label={secondaryLabel} secondary />
          </>
        ) : (
          <CameraPane label={primaryLabel} full />
        )}

        {isPip && (
          <View style={[styles.pip, { top: insets.top + 58 }]}>
            <CameraTexture compact />
            <Text style={styles.pipLabel}>{secondaryLabel}</Text>
            <View style={styles.pipToolbar}>
              <Text style={styles.pipTool}>⌁</Text>
              <Text style={styles.pipTool}>跑</Text>
              <Text style={styles.pipTool}>⋯</Text>
            </View>
          </View>
        )}

        <View style={[styles.captureState, { top: insets.top + 8 }]}>
          <View style={[styles.statePill, styles.activeState]}>
            <View style={styles.stateDot} />
            <Text style={styles.stateText}>闪光</Text>
          </View>
          <View style={[styles.statePill, styles.activeState]}>
            <View style={styles.stateDot} />
            <Text style={styles.stateText}>防抖</Text>
          </View>
          <Text style={[styles.stateText, recording && styles.recordingText]}>
            {captureHint}
          </Text>
        </View>

        {topVisible && (
          <View style={[styles.topTools, { top: insets.top + 36 }]}>
            <TouchableOpacity
              style={styles.glassCircle}
              activeOpacity={0.8}
              onPress={() =>
                setPrimaryCamera(value => (value === 'rear' ? 'front' : 'rear'))
              }
            >
              <Text style={styles.iconText}>⇄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.lensPill}
              activeOpacity={0.8}
              onPress={() =>
                setZoom(
                  current => zooms[(zooms.indexOf(current) + 1) % zooms.length],
                )
              }
            >
              <Text style={styles.lensText}>
                {zoom === '0.5x' ? '超广角' : zoom === '1x' ? '广角' : '长焦'} (
                {zoom})
              </Text>
              <Text style={styles.chevron}>⌄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.glassCircle}
              activeOpacity={0.8}
              onPress={() => setPanel(panel === 'menu' ? null : 'menu')}
            >
              <Text style={styles.iconText}>⋯</Text>
            </TouchableOpacity>
          </View>
        )}

        {topVisible && (
          <View style={[styles.zoomBar, { top: insets.top + 88 }]}>
            {zooms.map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.zoomItem,
                  zoom === item && styles.zoomItemActive,
                ]}
                onPress={() => setZoom(item)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.zoomText,
                    zoom === item && styles.zoomTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {proMode && (
          <View style={styles.proPanel}>
            {['ISO 自动', 'S 1/120', 'WB 自动', 'EV 0.0'].map(item => (
              <View key={item} style={styles.proItem}>
                <Text style={styles.proText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {bottomVisible && (
          <SafeAreaView style={styles.bottomSafe}>
            <View style={styles.bottomArea}>
              <View style={styles.modeTabs}>
                <ModeButton
                  active={mode === 'photo'}
                  label="拍照"
                  onPress={() => setMode('photo')}
                />
                <ModeButton
                  active={mode === 'video'}
                  label="视频"
                  onPress={() => setMode('video')}
                />
              </View>
              <View style={styles.controlRow}>
                <TouchableOpacity
                  style={styles.controlChip}
                  activeOpacity={0.8}
                  onPress={() =>
                    setLayout(value => (value === 'pip' ? 'split' : 'pip'))
                  }
                >
                  <Text style={styles.chipIcon}>▣</Text>
                  <Text style={styles.chipText}>{layoutLabel}</Text>
                </TouchableOpacity>
                {recording && (
                  <Text style={styles.timer}>
                    {formatDuration(recordingSeconds)}
                  </Text>
                )}
              </View>
              <View style={styles.shutterRow}>
                <TouchableOpacity
                  style={styles.sideButton}
                  activeOpacity={0.8}
                  onPress={() => setGalleryOpen(true)}
                >
                  <Text style={styles.iconText}>▧</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sideButton}
                  activeOpacity={0.8}
                  onPress={() =>
                    setPrimaryCamera(value =>
                      value === 'rear' ? 'front' : 'rear',
                    )
                  }
                >
                  <Text style={styles.iconText}>⇄</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shutterOuter}
                  activeOpacity={0.85}
                  onPress={handleShutter}
                >
                  <View
                    style={[
                      styles.shutterInner,
                      recording && styles.shutterRecording,
                    ]}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sideButton}
                  activeOpacity={0.8}
                  onPress={() => setMode('video')}
                >
                  <Text style={styles.iconText}>▮▶</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sideButton}
                  activeOpacity={0.8}
                  onPress={() => setPanel(panel === 'quick' ? null : 'quick')}
                >
                  <Text style={styles.iconText}>⋯</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        )}

        {panel === 'menu' && (
          <GlassPanel style={[styles.menuPanel, { top: insets.top + 82 }]}>
            <MenuItem
              icon="▧"
              label="相册"
              onPress={() => openMenuItem('gallery')}
            />
            <MenuItem
              icon="⚙"
              label="设置"
              onPress={() => openMenuItem('settings')}
            />
            <MenuItem icon="◐" label="滤镜库" />
            <MenuItem
              icon="▤"
              label={proMode ? '退出专业模式' : '专业模式'}
              onPress={() => openMenuItem('pro')}
            />
            <MenuItem icon="✦" label="AI增强" />
            <ToggleRow
              label="显示顶部工具栏"
              value={showTopBar}
              onValueChange={setShowTopBar}
            />
            <ToggleRow
              label="显示底部工具栏"
              value={showBottomBar}
              onValueChange={setShowBottomBar}
            />
          </GlassPanel>
        )}

        {panel === 'quick' && (
          <GlassPanel style={styles.quickPanel}>
            <Text style={styles.panelTitle}>快捷设置</Text>
            <Text style={styles.settingLabel}>宽高比</Text>
            <View style={styles.ratioGroup}>
              {ratios.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.ratioItem,
                    ratio === item && styles.ratioItemActive,
                  ]}
                  onPress={() => setRatio(item)}
                >
                  <Text
                    style={[
                      styles.ratioText,
                      ratio === item && styles.ratioTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <SettingLine label="拍摄倒计时" value="关闭" />
            <SettingLine label="对焦锁定" value="未锁定" />
            <SettingLine label="曝光" value="0.0 EV" />
            <SettingLine label="白平衡" value="自动" />
          </GlassPanel>
        )}
      </Pressable>

      <CapturePreview
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
      <GalleryModal
        visible={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
      <SettingsDrawer
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  )
}

const CameraPane = ({
  label,
  full,
  secondary,
}: {
  label: string
  full?: boolean
  secondary?: boolean
}) => (
  <View
    style={[
      styles.cameraPane,
      full && styles.cameraPaneFull,
      secondary && styles.cameraPaneSecondary,
    ]}
  >
    <CameraTexture />
    <View style={styles.gridOverlay}>
      <View style={styles.gridLineV} />
      <View style={[styles.gridLineV, { left: '66.66%' }]} />
      <View style={styles.gridLineH} />
      <View style={[styles.gridLineH, { top: '66.66%' }]} />
    </View>
    <Text style={styles.cameraLabel}>{label}</Text>
  </View>
)

const CameraTexture = ({ compact }: { compact?: boolean }) => (
  <View style={[styles.texture, compact && styles.textureCompact]}>
    <View style={styles.neonLine} />
    <View style={[styles.neonLine, styles.neonLineTwo]} />
    <View style={styles.lightBand} />
  </View>
)

const GlassPanel = ({
  children,
  style,
}: {
  children: React.ReactNode
  style?: object
}) => <View style={[styles.glassPanel, style]}>{children}</View>

const MenuItem = ({
  icon,
  label,
  onPress,
}: {
  icon: string
  label: string
  onPress?: () => void
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.75}
    onPress={onPress}
  >
    <Text style={styles.menuIcon}>{icon}</Text>
    <Text style={styles.menuLabel}>{label}</Text>
    <Text style={styles.menuArrow}>›</Text>
  </TouchableOpacity>
)

const ToggleRow = ({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.75}
    onPress={() => onValueChange(!value)}
  >
    <Text style={styles.menuIcon}>{value ? '●' : '○'}</Text>
    <Text style={styles.menuLabel}>{label}</Text>
    <View style={[styles.switchTrack, value && styles.switchTrackActive]}>
      <View style={[styles.switchKnob, value && styles.switchKnobActive]} />
    </View>
  </TouchableOpacity>
)

const SettingLine = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.settingLine}>
    <Text style={styles.settingLineLabel}>{label}</Text>
    <Text style={styles.settingValue}>{value}</Text>
  </View>
)

const ModeButton = ({
  active,
  label,
  onPress,
}: {
  active: boolean
  label: string
  onPress: () => void
}) => (
  <TouchableOpacity
    style={[styles.modeButton, active && styles.modeButtonActive]}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <Text style={[styles.modeText, active && styles.modeTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
)

const CapturePreview = ({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) => (
  <Modal visible={visible} animationType="fade" transparent>
    <View style={styles.modalBackdrop}>
      <View style={styles.previewCard}>
        <Text style={styles.modalTitle}>拍照预览</Text>
        <View style={styles.photoPair}>
          <PhotoMock label="后置" />
          <PhotoMock label="前置" />
        </View>
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.secondaryAction} onPress={onClose}>
            <Text style={styles.actionText}>重拍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryAction} onPress={onClose}>
            <Text style={styles.actionText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
)

const PhotoMock = ({ label }: { label: string }) => (
  <View style={styles.photoMock}>
    <CameraTexture />
    <Text style={styles.photoLabel}>{label}</Text>
  </View>
)

const GalleryModal = ({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) => (
  <Modal visible={visible} animationType="slide">
    <SafeAreaView style={styles.galleryRoot}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>相册</Text>
        <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
          <Text style={styles.iconText}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterTabs}>
        {['全部', '双摄照片', '视频'].map(item => (
          <View key={item} style={styles.filterTab}>
            <Text style={styles.filterText}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.galleryGrid}>
        {Array.from({ length: 12 }).map((_, index) => (
          <View key={index} style={styles.galleryTile}>
            <CameraTexture compact />
            <Text style={styles.dualBadge}>
              {index % 3 === 0 ? '视频' : '双摄'}
            </Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  </Modal>
)

const SettingsDrawer = ({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.drawerBackdrop}>
      <View style={styles.drawer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>设置</Text>
          <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
            <Text style={styles.iconText}>×</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SettingsSection
            title="拍摄设置"
            items={[
              '网格辅助线 开',
              '定时拍照 关闭',
              'HDR 开',
              '焦段切换提示 开',
            ]}
          />
          <SettingsSection
            title="视频设置"
            items={[
              '分辨率 1080p 30fps',
              '双视频合成 画中画',
              '专业模式录制 关',
            ]}
          />
          <SettingsSection
            title="界面设置"
            items={['音量键快门 开', '降低透明度省电 关', '显示闪光灯标识 开']}
          />
          <SettingsSection
            title="高级设置"
            items={['AI场景识别 开', '自动云备份 关', '拍摄数据分析 开']}
          />
        </ScrollView>
      </View>
    </View>
  </Modal>
)

const SettingsSection = ({
  title,
  items,
}: {
  title: string
  items: string[]
}) => (
  <View style={styles.settingsSection}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {items.map(item => (
      <View key={item} style={styles.drawerItem}>
        <Text style={styles.drawerItemText}>{item}</Text>
        <Text style={styles.menuArrow}>›</Text>
      </View>
    ))}
  </View>
)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  preview: { flex: 1, backgroundColor: '#020303' },
  cameraPane: { flex: 1, overflow: 'hidden', backgroundColor: '#071012' },
  cameraPaneFull: { ...StyleSheet.absoluteFillObject },
  cameraPaneSecondary: { backgroundColor: '#0d1216' },
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
  gridOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.26 },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cameraLabel: {
    position: 'absolute',
    left: 18,
    bottom: 26,
    color: 'rgba(255,255,255,0.42)',
    fontSize: 13,
    fontWeight: '600',
  },
  splitDivider: { height: 2, backgroundColor: 'rgba(255,255,255,0.16)' },
  pip: {
    position: 'absolute',
    right: 18,
    width: 142,
    height: 184,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#0a0f12',
  },
  pipLabel: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
  },
  pipToolbar: {
    position: 'absolute',
    top: 10,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(24,28,32,0.72)',
  },
  pipTool: { color: '#fff', fontSize: 13, fontWeight: '700' },
  captureState: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  activeState: { borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)' },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ff80',
  },
  stateText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    fontWeight: '700',
  },
  recordingText: { color: '#ff4757' },
  topTools: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,24,27,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  iconText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  lensPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(23,24,27,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  lensText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontWeight: '800',
  },
  chevron: { color: 'rgba(255,255,255,0.76)', fontSize: 20, fontWeight: '900' },
  zoomBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  zoomItem: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  zoomItemActive: {
    backgroundColor: 'rgba(0,212,255,0.18)',
    borderColor: 'rgba(0,212,255,0.36)',
  },
  zoomText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 12,
    fontWeight: '800',
  },
  zoomTextActive: { color: '#58e8ff' },
  bottomSafe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomArea: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  modeTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modeButtonActive: { backgroundColor: 'rgba(255,255,255,0.17)' },
  modeText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 13,
    fontWeight: '800',
  },
  modeTextActive: { color: '#fff' },
  controlRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  controlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipIcon: { color: '#fff', fontSize: 13 },
  chipText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '800',
  },
  timer: { color: '#ff4757', fontSize: 13, fontWeight: '900' },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,24,27,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8e8ea',
  },
  shutterRecording: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ff4757',
  },
  glassPanel: {
    position: 'absolute',
    borderRadius: 22,
    padding: 12,
    backgroundColor: 'rgba(22,24,27,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  menuPanel: { right: 18, width: 220 },
  quickPanel: { right: 18, bottom: 128, width: 246 },
  panelTitle: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  menuItem: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 24,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 20,
    textAlign: 'center',
  },
  menuLabel: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  menuArrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 24,
    fontWeight: '800',
  },
  switchTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: 2,
  },
  switchTrackActive: { backgroundColor: '#00d4ff' },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  switchKnobActive: { transform: [{ translateX: 16 }] },
  settingLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  ratioGroup: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  ratioItem: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  ratioItemActive: {
    backgroundColor: 'rgba(0,212,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.35)',
  },
  ratioText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '800',
  },
  ratioTextActive: { color: '#58e8ff' },
  settingLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  settingLineLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '700',
  },
  settingValue: { color: '#58e8ff', fontSize: 12, fontWeight: '800' },
  proPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 178,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(20,22,26,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  proItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  proText: { color: '#fff', fontSize: 12, fontWeight: '800' },
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
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
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
  photoLabel: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
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
  actionText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  galleryRoot: { flex: 1, backgroundColor: '#08090c' },
  modalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  filterText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '800',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 4,
  },
  galleryTile: {
    width: '32.6%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  dualBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  drawerBackdrop: {
    flex: 1,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    width: '86%',
    height: '100%',
    paddingTop: 36,
    paddingHorizontal: 12,
    backgroundColor: '#090b12',
  },
  settingsSection: { marginBottom: 24 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 12,
    fontWeight: '900',
    marginHorizontal: 8,
    marginBottom: 10,
  },
  drawerItem: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  drawerItemText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})

export default DualCamera
