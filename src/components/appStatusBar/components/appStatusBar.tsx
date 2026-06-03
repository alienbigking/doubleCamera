import React from 'react'
import { StatusBar, Platform } from 'react-native'

interface AppStatusBarProps {
  translucent?: boolean
  barStyle?: 'dark-content' | 'light-content'
  backgroundColor?: string
}

const AppStatusBar = ({
  translucent = false,
  barStyle = 'dark-content',
  backgroundColor = '#fff',
}: AppStatusBarProps) => {
  if (Platform.OS === 'ios') {
    return <StatusBar barStyle={barStyle} />
  }

  return (
    <StatusBar
      barStyle={barStyle}
      backgroundColor={backgroundColor}
      translucent={translucent}
    />
  )
}

export default AppStatusBar
