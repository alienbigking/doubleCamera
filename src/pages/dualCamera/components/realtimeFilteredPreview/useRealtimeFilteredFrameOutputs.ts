import { useCallback, useEffect, useMemo } from 'react'
import { type SkImage } from '@shopify/react-native-skia'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import {
  CommonResolutions,
  type CameraFrameOutput,
  type Frame,
  useFrameOutput,
} from 'react-native-vision-camera'
import { renderToTexture } from 'react-native-vision-camera-skia'
import { scheduleOnRN } from 'react-native-worklets'
import type {
  DualCameraFilterId,
  ProfessionalToneAdjustments,
} from '../filters'
import {
  createRealtimeFilterRenderAssets,
  drawRealtimeFilteredFrame,
} from '../filters/filterRealtimeRenderer'

type CameraSide = 'rear' | 'front'
type FrameOutputs = Record<CameraSide, CameraFrameOutput>
type FrameTextures = Record<CameraSide, SharedValue<SkImage | null>>

type UseRealtimeFilteredFrameOutputsOptions = {
  enabled: boolean
  filterId: DualCameraFilterId
  toneAdjustments: ProfessionalToneAdjustments
}

type UseRealtimeFilteredFrameOutputsResult = {
  frameOutputs: FrameOutputs
  textures: FrameTextures
}

// 双路实时滤镜帧输出 Hook：统一维护前后摄的 frameOutput 与纹理结果，供主画面和小窗复用。
export const useRealtimeFilteredFrameOutputs = ({
  enabled,
  filterId,
  toneAdjustments,
}: UseRealtimeFilteredFrameOutputsOptions): UseRealtimeFilteredFrameOutputsResult => {
  const rearTexture = useSharedValue<SkImage | null>(null)
  const frontTexture = useSharedValue<SkImage | null>(null)

  const textures = useMemo<FrameTextures>(
    () => ({
      rear: rearTexture,
      front: frontTexture,
    }),
    [frontTexture, rearTexture],
  )

  const renderAssets = useMemo(
    () => createRealtimeFilterRenderAssets(filterId, toneAdjustments),
    [filterId, toneAdjustments],
  )

  const updatePreviewTexture = useCallback(
    (side: CameraSide, nextTexture: SkImage | null) => {
      const targetTexture = textures[side]
      const previousTexture = targetTexture.get()
      targetTexture.set(nextTexture)
      if (previousTexture != null) {
        previousTexture.dispose()
      }
    },
    [textures],
  )

  const clearPreviewTexture = useCallback(
    (side: CameraSide) => {
      updatePreviewTexture(side, null)
    },
    [updatePreviewTexture],
  )

  const createOnFrame = useCallback(
    (side: CameraSide) => {
      return (frame: Frame) => {
        'worklet'

        let snapshot: SkImage | undefined

        try {
          if (enabled) {
            snapshot = renderToTexture(frame, ({ canvas, frameTexture }) => {
              drawRealtimeFilteredFrame({
                canvas,
                frameTexture,
                assets: renderAssets,
              })
            })

            const snapshotCpuCopy = snapshot.makeNonTextureImage()
            if (snapshotCpuCopy == null) {
              throw new Error(
                `Failed to create CPU copy for ${side} realtime filter preview.`,
              )
            }

            scheduleOnRN(updatePreviewTexture, side, snapshotCpuCopy)
          }
        } catch (error) {
          console.error(`Realtime filter render failed on ${side}! ${error}`)
        } finally {
          snapshot?.dispose()
          frame.dispose()
        }
      }
    },
    [enabled, renderAssets, updatePreviewTexture],
  )

  const rearFrameOutput = useFrameOutput({
    targetResolution: CommonResolutions.HD_16_9,
    pixelFormat: 'yuv',
    allowDeferredStart: false,
    enablePreviewSizedOutputBuffers: true,
    dropFramesWhileBusy: true,
    onFrame: createOnFrame('rear'),
  })

  const frontFrameOutput = useFrameOutput({
    targetResolution: CommonResolutions.HD_16_9,
    pixelFormat: 'yuv',
    allowDeferredStart: false,
    enablePreviewSizedOutputBuffers: true,
    dropFramesWhileBusy: true,
    onFrame: createOnFrame('front'),
  })

  const frameOutputs = useMemo<FrameOutputs>(
    () => ({
      rear: rearFrameOutput,
      front: frontFrameOutput,
    }),
    [frontFrameOutput, rearFrameOutput],
  )

  useEffect(() => {
    frameOutputs.rear.outputOrientation = 'up'
    frameOutputs.front.outputOrientation = 'down'
  }, [frameOutputs])

  useEffect(() => {
    if (!enabled || filterId === 'none') {
      clearPreviewTexture('rear')
      clearPreviewTexture('front')
    }
  }, [clearPreviewTexture, enabled, filterId])

  useEffect(
    () => () => {
      clearPreviewTexture('rear')
      clearPreviewTexture('front')
    },
    [clearPreviewTexture],
  )

  return {
    frameOutputs,
    textures,
  }
}
