import { createNavigationContainerRef } from '@react-navigation/native'
import type { RootStackParamList } from '@/navigation/appNavigator'

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

export const navigate = (name: keyof RootStackParamList) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any)
  }
}

export const reset = (name: keyof RootStackParamList) => {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name }],
    })
  }
}
