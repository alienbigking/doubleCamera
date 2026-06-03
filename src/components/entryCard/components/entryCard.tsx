import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native'
import type { Entry } from '@/pages/home/types'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2

interface EntryCardProps {
  entry: Entry
  onPress: (entry: Entry) => void
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onPress }) => {
  return (
    <View style={[styles.card, { width: CARD_WIDTH, maxWidth: CARD_WIDTH }]}>
      <View
        style={[
          styles.topHighlight,
          { backgroundColor: entry.platformColor + '55' },
        ]}
      />

      <View style={styles.cardContent}>
        <View
          style={[styles.iconWrap, { backgroundColor: entry.platformColor }]}
        >
          <Text style={styles.logoText}>{entry.platformName.charAt(0)}</Text>
        </View>

        <Text style={[styles.platform, { color: entry.platformColor }]}>
          {entry.platformName}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {entry.title}
        </Text>

        {entry.tag ? (
          <View
            style={[
              styles.tagWrap,
              { backgroundColor: entry.platformColor + '20' },
            ]}
          >
            <Text style={[styles.tagText, { color: entry.platformColor }]}>
              {entry.tag}
            </Text>
          </View>
        ) : (
          <View style={styles.tagPlaceholder} />
        )}
      </View>

      <TouchableOpacity
        style={[styles.btn, { borderColor: entry.platformColor + '30' }]}
        onPress={() => onPress(entry)}
        activeOpacity={0.75}
      >
        <Text style={[styles.btnText, { color: entry.platformColor }]}>
          打开入口
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.88)',
    ...Platform.select({
      ios: {
        shadowColor: '#7B8FC4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 18,
      },
      android: {},
    }),
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {},
    }),
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  platform: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
    opacity: 0.85,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A3320',
    lineHeight: 20,
    marginBottom: 10,
  },
  tagWrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tagPlaceholder: { height: 19, marginBottom: 12 },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})

export default EntryCard
