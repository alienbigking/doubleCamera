import React from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import type { Platform, PlatformId } from '../types'

interface PlatformFilterProps {
  platforms: Platform[]
  selected: PlatformId
  onSelect: (id: PlatformId) => void
}

const PlatformFilter: React.FC<PlatformFilterProps> = ({
  platforms,
  selected,
  onSelect,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {platforms.map(platform => {
        const isActive = selected === platform.id
        return (
          <TouchableOpacity
            key={platform.id}
            style={[
              styles.chip,
              isActive && {
                backgroundColor: platform.color,
                borderColor: platform.color,
              },
            ]}
            onPress={() => onSelect(platform.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {platform.name}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#9999BB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
})

export default PlatformFilter
