import React from 'react'
import { StyleSheet } from 'react-native'
import { GlassPanel, MenuItem, ToggleRow } from '../controls'

// 更多菜单弹层组件：承载相册、设置、专业模式和工具栏显示开关。
export const MoreMenuPanel = ({
  top,
  proMode,
  showTopBar,
  showBottomBar,
  onOpenGallery,
  onOpenSettings,
  onToggleProMode,
  onToggleTopBar,
  onToggleBottomBar,
}: {
  top: number
  proMode: boolean
  showTopBar: boolean
  showBottomBar: boolean
  onOpenGallery: () => void
  onOpenSettings: () => void
  onToggleProMode: () => void
  onToggleTopBar: (value: boolean) => void
  onToggleBottomBar: (value: boolean) => void
}) => (
  <GlassPanel style={[styles.menuPanel, { top }]}>
    <MenuItem icon="▧" label="相册" onPress={onOpenGallery} />
    <MenuItem icon="⚙" label="设置" onPress={onOpenSettings} />
    <MenuItem icon="◐" label="滤镜库" />
    <MenuItem
      icon="▤"
      label={proMode ? '退出专业模式' : '专业模式'}
      onPress={onToggleProMode}
    />
    <MenuItem icon="✦" label="AI增强" />
    <ToggleRow
      label="显示顶部工具栏"
      value={showTopBar}
      onValueChange={onToggleTopBar}
    />
    <ToggleRow
      label="显示底部工具栏"
      value={showBottomBar}
      onValueChange={onToggleBottomBar}
    />
  </GlassPanel>
)

const styles = StyleSheet.create({
  menuPanel: { right: 18, width: 220 },
})
