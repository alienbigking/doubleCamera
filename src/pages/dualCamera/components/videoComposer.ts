import { NativeModules, Platform } from 'react-native'
import type { DualVideoComposeMode } from './cameraControls'

type CameraSide = 'rear' | 'front'
type Point = { x: number; y: number }
type Size = { width: number; height: number }
type RecordedVideo = { side: CameraSide; filePath: string }

type ComposeDualVideoOptions = {
  videos: RecordedVideo[]
  layout: DualVideoComposeMode
  primaryCamera: CameraSide
  pipPosition: Point
  pipSize: Size
  previewSize: Size
  pipBorderVisible?: boolean
}

type DualVideoComposerModule = {
  composeDualVideo: (
    rearVideoPath: string,
    frontVideoPath: string,
    layout: DualVideoComposeMode,
    pipX: number,
    pipY: number,
    pipWidth: number,
    pipHeight: number,
    previewWidth: number,
    previewHeight: number,
    primaryCamera: CameraSide,
    pipBorderVisible: boolean,
  ) => Promise<string>
}

const nativeComposer = NativeModules.DualVideoComposer as
  | DualVideoComposerModule
  | undefined

const stripFileScheme = (uri: string) =>
  uri.startsWith('file://') ? uri.replace('file://', '') : uri

const findVideoPath = (videos: RecordedVideo[], side: CameraSide) => {
  const video = videos.find(item => item.side === side)
  if (!video) {
    throw new Error(`Missing ${side} video file.`)
  }
  return stripFileScheme(video.filePath)
}

// 双摄视频合成桥接组件：统一封装原生 AVFoundation 画中画/分屏导出能力。
export const composeDualVideo = async ({
  videos,
  layout,
  primaryCamera,
  pipPosition,
  pipSize,
  previewSize,
  pipBorderVisible = true,
}: ComposeDualVideoOptions) => {
  if (Platform.OS !== 'ios') {
    throw new Error('Dual video composition is currently only implemented on iOS.')
  }
  if (!nativeComposer?.composeDualVideo) {
    throw new Error('DualVideoComposer native module is not available.')
  }

  return nativeComposer.composeDualVideo(
    findVideoPath(videos, 'rear'),
    findVideoPath(videos, 'front'),
    layout,
    pipPosition.x,
    pipPosition.y,
    pipSize.width,
    pipSize.height,
    previewSize.width,
    previewSize.height,
    primaryCamera,
    pipBorderVisible,
  )
}
