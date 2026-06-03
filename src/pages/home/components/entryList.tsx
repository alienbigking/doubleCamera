import React, { useCallback, useMemo } from 'react'
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { EntryCard } from '@/components/entryCard'
import { openEntryService } from '../services'
import type { Entry, PlatformId } from '../types'

interface EntryListProps {
  entries: Entry[]
  selectedPlatform: PlatformId
  searchKeyword: string
  onShowGuide?: () => void
}

const EntryList: React.FC<EntryListProps> = ({
  entries,
  selectedPlatform,
  searchKeyword,
  onShowGuide,
}) => {
  const filtered = useMemo(() => {
    return entries.filter(entry => {
      const matchPlatform =
        selectedPlatform === 'all' || entry.platform === selectedPlatform
      const matchSearch =
        !searchKeyword ||
        entry.title.includes(searchKeyword) ||
        entry.platformName.includes(searchKeyword)
      return matchPlatform && matchSearch
    })
  }, [entries, selectedPlatform, searchKeyword])

  const handleOpen = useCallback((entry: Entry) => {
    openEntryService.open(entry)
  }, [])

  if (filtered.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>暂无相关入口</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* 固定头部 */}
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>热门入口</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.guideBtn}
            onPress={onShowGuide}
            activeOpacity={0.7}
          >
            <Text style={styles.guideBtnText}>使用指引</Text>
          </TouchableOpacity>
          <Text style={styles.listHeaderCount}>{filtered.length} 个入口</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <EntryCard entry={item} onPress={handleOpen} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    gap: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guideBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  guideBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listHeaderCount: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
})

export default EntryList
