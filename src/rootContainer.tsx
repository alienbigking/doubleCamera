import React, { useState, useCallback } from 'react'
import {
  NavigationContainer,
  type NavigationState,
} from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'
import AppNavigator from '@/navigation/appNavigator'
import { navigationRef } from '@/navigation/navigationService'
import ToastManager from 'toastify-react-native'
import { useNavigationStore } from '@/navigation/stores'

const RootContainer = () => {
  const [navReady, setNavReady] = useState(false)
  const { setCurrentRoute } = useNavigationStore()

  const onNavigationStateChange = useCallback(
    (state: NavigationState | undefined) => {
      if (state) {
        const route = state.routes[state.index]
        setCurrentRoute(route.name)
      }
    },
    [setCurrentRoute],
  )

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => setNavReady(true)}
        onStateChange={onNavigationStateChange}
      >
        <AppNavigator />
      </NavigationContainer>
      <ToastManager
        style={styles.toastManager}
        width="90%"
        textStyle={styles.toastText}
        theme="light"
        animationStyle="slide"
        position="top"
        duration={2000}
        showCloseIcon={false}
        showProgressBar={true}
        topOffset={50}
        iconSize={24}
        useModal={false}
      />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  toastManager: {
    top: 50,
  },
  toastText: {
    fontSize: 16,
    fontWeight: '600',
  },
})

export default RootContainer
