import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import type { SaveFeedback } from './types'

// 保存反馈组件：拍照保存过程中展示“保存中/已保存”的轻提示。
export const SaveFeedbackToast = ({
  feedback,
  bottom,
}: {
  feedback: SaveFeedback
  bottom: number
}) => {
  if (!feedback) return null

  return (
    <View pointerEvents="none" style={[styles.saveFeedback, { bottom }]}>
      <MaterialIcons
        name={feedback === 'saved' ? 'check-circle' : 'save'}
        color={feedback === 'saved' ? '#72ff9d' : '#fff'}
        size={18}
      />
      <Text style={styles.saveFeedbackText}>
        {feedback === 'saved' ? '已保存' : '保存中'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  saveFeedback: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 13,
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
  },
})
