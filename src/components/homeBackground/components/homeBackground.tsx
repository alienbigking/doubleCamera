import React from 'react'
import { ImageBackground, StyleSheet } from 'react-native'
import { useSettingsStore } from '@/pages/settings/stores'

const DEFAULT_BG = require('@/assets/images/appBg.png')

interface HomeBackgroundProps {
  children: React.ReactNode
}

const HomeBackground: React.FC<HomeBackgroundProps> = ({ children }) => {
  const homeBackgroundImagePath = useSettingsStore(
    s => s.homeBackgroundImagePath,
  )

  const source = homeBackgroundImagePath
    ? { uri: `file://${homeBackgroundImagePath}` }
    : DEFAULT_BG

  return (
    <ImageBackground source={source} style={styles.root} resizeMode="cover">
      {children}
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})

export default HomeBackground
