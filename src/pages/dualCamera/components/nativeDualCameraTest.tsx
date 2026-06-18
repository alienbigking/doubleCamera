import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { NativeCameraTestController } from './nativeDualCameraPreview'

const NativeDualCameraTest = () => {
  const insets = useSafeAreaInsets()
  const [statusText, setStatusText] = useState('正在打开原生相机')

  const openNativeCamera = useCallback(async () => {
    try {
      setStatusText('正在打开原生相机')
      if (!NativeCameraTestController?.showMinimalCamera) {
        throw new Error('原生相机模块未注册成功')
      }
      await NativeCameraTestController.showMinimalCamera()
      setStatusText('双摄界面已打开')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatusText(message || '原生相机打开失败')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void openNativeCamera()
    }, 120)

    return () => {
      clearTimeout(timer)
    }
  }, [openNativeCamera])

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.iconButtonGhost} />
        <View style={styles.titleBlock}>
          <Text style={styles.title}>小熊双摄</Text>
          <Text style={styles.subtitle}>当前默认使用原生双摄控制器</Text>
        </View>
        <View style={styles.iconButtonGhost} />
      </View>

      <View style={styles.centerBlock}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{statusText}</Text>
        </View>
        <Text style={styles.helperText}>
          当前首页已经直接切到原生双摄入口。关闭原生相机后，也可以在这里重新拉起双摄界面。
        </Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.84}
          onPress={() => {
            void openNativeCamera()
          }}
        >
          <MaterialIcons name="photo-camera" color="#fff" size={22} />
          <Text style={styles.primaryButtonText}>打开双摄界面</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#040506',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconButtonGhost: {
    width: 44,
    height: 44,
  },
  titleBlock: {
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  helperText: {
    marginTop: 18,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 24,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})

export default NativeDualCameraTest
