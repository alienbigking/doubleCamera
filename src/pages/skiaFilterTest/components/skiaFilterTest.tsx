import React, { useMemo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Skia } from '@shopify/react-native-skia'
import {
  SkiaCamera,
  type SkiaOnFrameState,
} from 'react-native-vision-camera-skia'
import {
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera'
import { useSharedValue } from 'react-native-reanimated'
import type { RootStackParamList } from '@/navigation/appNavigator'

type TestScreenNavigation = NativeStackNavigationProp<RootStackParamList>

const monochromeMatrix = [
  0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152,
  0.0722, 0, 0, 0, 0, 0, 1, 0,
]

// Skia 黑白预览测试页：单独验证官方 SkiaCamera 链路是否能在真机实时输出灰度预览。
const SkiaFilterTest = () => {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<TestScreenNavigation>()
  const { hasPermission, requestPermission } = useCameraPermission()
  const device = useCameraDevice('back')
  const monoEnabled = useSharedValue(true)

  const monoPaint = useMemo(() => {
    const paint = Skia.Paint()
    paint.setAntiAlias(true)
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(monochromeMatrix))
    return paint
  }, [])

  const renderFrame = (state: SkiaOnFrameState) => {
    'worklet'
    const { canvas, frameTexture } = state
    canvas.drawImage(
      frameTexture,
      0,
      0,
      monoEnabled.value ? monoPaint : undefined,
    )
  }

  if (!hasPermission) {
    return (
      <View style={styles.permissionRoot}>
        <Text style={styles.permissionTitle}>需要相机权限</Text>
        <Text style={styles.permissionText}>
          先授权相机，再验证 Skia 实时黑白预览。
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            requestPermission().catch(error => {
              console.warn('Request camera permission failed', error)
            })
          }}
        >
          <Text style={styles.primaryButtonText}>授权相机</Text>
        </Pressable>
      </View>
    )
  }

  if (!device) {
    return (
      <View style={styles.permissionRoot}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.permissionText}>正在加载摄像头...</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SkiaCamera
        style={styles.camera}
        device={device}
        isActive
        pixelFormat="yuv"
        enablePreviewSizedOutputBuffers
        onFrame={(frame, render) => {
          'worklet'
          render(renderFrame)
          frame.dispose()
        }}
      />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 14,
          },
        ]}
      >
        <Pressable
          style={styles.ghostButton}
          onPress={() => navigation.navigate('Camera')}
        >
          <Text style={styles.ghostButtonText}>返回双摄</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Skia 实时滤镜测试</Text>
          <Text style={styles.subtitle}>后置单摄 · 官方 SkiaCamera 链路</Text>
        </View>
      </View>

      <View
        style={[
          styles.bottomPanel,
          {
            paddingBottom: insets.bottom + 22,
          },
        ]}
      >
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>当前模式</Text>
          <Text style={styles.tipValue}>
            {monoEnabled.value ? '黑白预览' : '原始预览'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.modeButton,
              !monoEnabled.value && styles.modeButtonActive,
            ]}
            onPress={() => {
              monoEnabled.value = false
            }}
          >
            <Text
              style={[
                styles.modeButtonText,
                !monoEnabled.value && styles.modeButtonTextActive,
              ]}
            >
              原始
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.modeButton,
              monoEnabled.value && styles.modeButtonActive,
            ]}
            onPress={() => {
              monoEnabled.value = true
            }}
          >
            <Text
              style={[
                styles.modeButtonText,
                monoEnabled.value && styles.modeButtonTextActive,
              ]}
            >
              黑白
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: '#050608',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '400',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    minWidth: 120,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0d0f12',
    fontSize: 15,
    fontWeight: '400',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ghostButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(17,17,17,0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
  },
  titleBlock: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '400',
  },
  subtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '400',
  },
  bottomPanel: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    gap: 12,
  },
  tipCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(16,16,18,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tipTitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '400',
  },
  tipValue: {
    marginTop: 4,
    color: '#fff',
    fontSize: 18,
    fontWeight: '400',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: 'rgba(20,20,22,0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
  },
  modeButtonTextActive: {
    color: '#0b0c0e',
  },
})

export default SkiaFilterTest
