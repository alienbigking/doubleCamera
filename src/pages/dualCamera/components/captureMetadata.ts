import { NativeModules, Platform } from 'react-native'

export type CaptureLocation = {
  latitude: number
  longitude: number
  altitude: number
  horizontalAccuracy: number
  verticalAccuracy: number
  timestamp: number
  isMock: boolean
}

type CaptureMetadataManagerModule = {
  prepareRecordingAudio: (
    channelCount: number,
    sampleRate: number,
  ) => Promise<number>
  requestCurrentLocation: () => Promise<CaptureLocation>
}

const nativeManager = NativeModules.VolumeButtonManager as
  | CaptureMetadataManagerModule
  | undefined

export const prepareRecordingAudio = async (
  channelCount: number,
  sampleRate: number,
) => {
  if (Platform.OS !== 'ios' || !nativeManager?.prepareRecordingAudio) {
    return channelCount
  }

  return nativeManager.prepareRecordingAudio(channelCount, sampleRate)
}

export const requestCurrentCaptureLocation = async () => {
  if (Platform.OS !== 'ios' || !nativeManager?.requestCurrentLocation) {
    return null
  }

  return nativeManager.requestCurrentLocation()
}
