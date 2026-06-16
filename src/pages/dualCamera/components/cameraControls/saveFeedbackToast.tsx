import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { useTranslation } from 'react-i18next'
import type { SaveFeedback } from './types'

// 保存反馈组件：拍照保存过程中展示“保存中/已保存”的轻提示。
export const SaveFeedbackToast = ({
  feedback,
  bottom,
}: {
  feedback: SaveFeedback
  bottom: number
}) => {
  const { t } = useTranslation()
  if (!feedback) return null

  const isSaved = feedback === 'saved'
  const isFailed = feedback === 'failed'
  const isFallback = feedback === 'fallback'

  return (
    <View pointerEvents="none" style={[styles.saveFeedback, { bottom }]}>
      <MaterialIcons
        name={
          isSaved
            ? 'check-circle'
            : isFailed
            ? 'error-outline'
            : isFallback
            ? 'info-outline'
            : 'save'
        }
        color={isSaved ? '#72ff9d' : isFailed ? '#ff8c8c' : '#fff'}
        size={18}
      />
      <Text style={styles.saveFeedbackText}>
        {isSaved
          ? t('saveFeedback.saved')
          : isFailed
          ? t('saveFeedback.failed')
          : isFallback
          ? t('saveFeedback.fallback')
          : t('saveFeedback.saving')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  saveFeedback: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 34,
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(23,24,27,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  saveFeedbackText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    flexShrink: 1,
  },
})
