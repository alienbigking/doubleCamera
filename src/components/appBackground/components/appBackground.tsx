import React from 'react'
import { StyleSheet, View } from 'react-native'

interface AppBackgroundProps {
  children: React.ReactNode
  style?: object
  backgroundColor?: string
}

const AppBackground: React.FC<AppBackgroundProps> = ({
  children,
  style,
  backgroundColor = '#FAFAF7',
}) => {
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

export default AppBackground
