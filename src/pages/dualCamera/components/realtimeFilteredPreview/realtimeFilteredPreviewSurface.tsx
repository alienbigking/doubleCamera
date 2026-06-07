import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Canvas, Image, type SkImage } from '@shopify/react-native-skia'
import {
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import type { CameraPreviewOutput } from 'react-native-vision-camera'
import { CameraPreviewSurface } from '../cameraPreview'

type RealtimeFilteredPreviewSurfaceProps = {
  previewOutput?: CameraPreviewOutput
  texture: SharedValue<SkImage | null>
}

// 主画面实时滤镜预览组件：底层保留原生预览，Skia 画布只负责覆盖已经渲染好的实时滤镜纹理。
export const RealtimeFilteredPreviewSurface = ({
  previewOutput,
  texture,
}: RealtimeFilteredPreviewSurfaceProps) => {
  const canvasSize = useSharedValue({ width: 0, height: 0 })
  const canvasRect = useDerivedValue(() => ({
    x: 0,
    y: 0,
    width: canvasSize.value.width,
    height: canvasSize.value.height,
  }))

  return (
    <View style={styles.root}>
      <CameraPreviewSurface previewOutput={previewOutput} />
      <Canvas pointerEvents="none" style={styles.canvas} onSize={canvasSize}>
        <Image image={texture} rect={canvasRect} fit="cover" />
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
})
