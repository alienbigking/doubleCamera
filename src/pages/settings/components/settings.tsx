import React from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '../stores'
import BackgroundSetting from './backgroundSetting'

const bgPresets = [
  { color: '#FAFAF7', label: '暖白' },
  { color: '#FFF5F6', label: '玫瑰白' },
  { color: '#F5F0FF', label: '薰衣草' },
  { color: '#F0F7FF', label: '天空蓝' },
  { color: '#F0FFF4', label: '薄荷绿' },
  { color: '#F5F5F5', label: '浅灰' },
]

const Settings: React.FC = () => {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const appBackground = useSettingsStore(s => s.appBackground)
  const setAppBackground = useSettingsStore(s => s.setAppBackground)

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: appBackground },
      ]}
    >
      <View style={[styles.header, { backgroundColor: appBackground }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚙️ 设置</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>外观</Text>
          <Text style={styles.settingDesc}>自定义 App 页面背景色</Text>
          <View style={styles.colorRow}>
            {bgPresets.map(preset => (
              <TouchableOpacity
                key={preset.color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: preset.color },
                  appBackground === preset.color && styles.colorSwatchSelected,
                ]}
                onPress={() => setAppBackground(preset.color)}
                activeOpacity={0.8}
              >
                {appBackground === preset.color && (
                  <Text style={styles.colorCheck}>✓</Text>
                )}
                <Text style={styles.colorLabel}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.sectionSpacing]}>
          <BackgroundSetting />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 72 },
  backText: { fontSize: 16, color: '#E84C5F', fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  headerRight: { width: 40, height: 40 },
  content: { flex: 1, padding: 24 },
  section: { gap: 12 },
  sectionSpacing: { marginTop: 32 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  settingDesc: { fontSize: 13, color: '#666', marginBottom: 8 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: { borderColor: '#E84C5F', borderWidth: 2.5 },
  colorCheck: { fontSize: 18, color: '#E84C5F', fontWeight: '700' },
  colorLabel: { fontSize: 10, color: '#888', marginTop: 2 },
})

export default Settings
