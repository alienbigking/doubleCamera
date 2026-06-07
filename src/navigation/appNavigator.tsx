import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import DualCamera from '@/pages/dualCamera/components/dualCamera'
import SkiaFilterTest from '@/pages/skiaFilterTest/components/skiaFilterTest'

export type RootStackParamList = {
  Camera: undefined
  SkiaFilterTest: undefined
  Main: undefined
  Login: undefined
  Register: undefined
  Settings: undefined
  HelpFeedback: undefined
  EditProfile: { userInfo: unknown }
  WebViewScreen: { url: string; title: string; deeplink?: string }
  AboutApp: undefined
  FollowAccount: undefined
  PrivacyPolicy: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        statusBarStyle: 'light',
        statusBarTranslucent: true,
        statusBarBackgroundColor: 'transparent',
        contentStyle: { backgroundColor: '#000' },
      }}
      initialRouteName="Camera"
    >
      <Stack.Screen name="SkiaFilterTest" component={SkiaFilterTest} />
      <Stack.Screen name="Camera" component={DualCamera} />
    </Stack.Navigator>
  )
}

export default AppNavigator
