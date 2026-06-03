import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useHomeStore } from '../stores'
import { homeService } from '../services'
import PlatformFilter from './platformFilter'
import EntryList from './entryList'
import HomeBackground from '@/components/homeBackground'
import GuideModal from '@/components/guideModal'
import { FaqModal } from '@/components/faqModal'

const GUIDE_SHOWN_KEY = '@guide_shown_v1'

const Home: React.FC = () => {
  const insets = useSafeAreaInsets()
  const selectedPlatform = useHomeStore(s => s.selectedPlatform)
  const searchKeyword = useHomeStore(s => s.searchKeyword)
  const entries = useHomeStore(s => s.entries)
  const platforms = useHomeStore(s => s.platforms)
  const setSelectedPlatform = useHomeStore(s => s.setSelectedPlatform)
  const setSearchKeyword = useHomeStore(s => s.setSearchKeyword)
  const setHomeConfig = useHomeStore(s => s.setHomeConfig)
  const [guideVisible, setGuideVisible] = useState(false)
  const [faqVisible, setFaqVisible] = useState(false)

  // 首次进入自动显示指引（只显示一次）
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasShown = await AsyncStorage.getItem(GUIDE_SHOWN_KEY)
        if (!hasShown) {
          setGuideVisible(true)
          await AsyncStorage.setItem(GUIDE_SHOWN_KEY, 'true')
        }
      } catch {
        // 忽略错误
      }
    }
    checkFirstLaunch()
  }, [])

  useEffect(() => {
    homeService.getHomeConfig().then(({ data }) => {
      if (data) {
        setHomeConfig(data)
      }
    })
  }, [setHomeConfig])

  return (
    <HomeBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>优惠入口</Text>
          <Text style={styles.subtitle}>一键直达官方活动页</Text>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => setFaqVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.helpBtnText}>?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索平台或入口名称"
            placeholderTextColor="#AEAEB2"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.filterWrapper}>
          <PlatformFilter
            platforms={platforms}
            selected={selectedPlatform}
            onSelect={setSelectedPlatform}
          />
        </View>

        <EntryList
          entries={entries}
          selectedPlatform={selectedPlatform}
          searchKeyword={searchKeyword}
          onShowGuide={() => setGuideVisible(true)}
        />

        <GuideModal
          visible={guideVisible}
          onClose={() => setGuideVisible(false)}
        />

        <FaqModal visible={faqVisible} onClose={() => setFaqVisible(false)} />
      </View>
    </HomeBackground>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  helpBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3320',
    letterSpacing: -0.3,
  },
  subtitle: {
    flex: 1,
    fontSize: 11,
    color: '#6B8F71',
    fontWeight: '500',
    textAlign: 'right',
    marginRight: 10,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1A3320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  filterWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
})

export default Home
