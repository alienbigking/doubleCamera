import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

// 控制状态提示组件：用于闪光灯、防抖等顶部功能切换后的文字反馈。
export const ControlStatusToast = ({
  message,
  bottom,
}: {
  message: string | null
  bottom: number
}) => {
  if (!message) return null

  const countdown = /^\d+$/.test(message)

  return (
    <View
      pointerEvents="none"
      style={[styles.toast, countdown && styles.countdownToast, { bottom }]}
    >
      <Text style={[styles.toastText, countdown && styles.countdownText]}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,24,27,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  toastText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
  },
  countdownToast: {
    minWidth: 74,
    minHeight: 74,
    borderRadius: 37,
    paddingHorizontal: 0,
    backgroundColor: 'rgba(23,24,27,0.72)',
  },
  countdownText: {
    fontSize: 38,
    lineHeight: 44,
  },
})
