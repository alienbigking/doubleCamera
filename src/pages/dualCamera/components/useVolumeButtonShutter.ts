import { useEffect, useRef } from 'react'
import { NativeEventEmitter, NativeModules, Platform } from 'react-native'

type VolumeButtonEvent = {
  direction?: 'up' | 'down'
}

const volumeButtonManager = NativeModules.VolumeButtonManager

// 音量键快门 Hook：订阅原生音量键事件，并转发给当前相机快门逻辑。
export const useVolumeButtonShutter = ({
  enabled,
  onPress,
}: {
  enabled: boolean
  onPress: () => void
}) => {
  const onPressRef = useRef(onPress)
  const lastTriggerAtRef = useRef(0)

  useEffect(() => {
    onPressRef.current = onPress
  }, [onPress])

  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios' || !volumeButtonManager) return

    const eventEmitter = new NativeEventEmitter(volumeButtonManager)
    const subscription = eventEmitter.addListener(
      'VolumeButtonPressed',
      (_event: VolumeButtonEvent) => {
        const now = Date.now()
        if (now - lastTriggerAtRef.current < 650) return

        lastTriggerAtRef.current = now
        onPressRef.current()
      },
    )

    return () => subscription.remove()
  }, [enabled])
}
