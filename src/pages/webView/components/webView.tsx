import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { RootStackParamList } from '@/navigation/appNavigator'

type WebViewScreenRouteProp = RouteProp<RootStackParamList, 'WebViewScreen'>

const WebViewScreen: React.FC = () => {
  const navigation = useNavigation()
  const route = useRoute<WebViewScreenRouteProp>()
  const insets = useSafeAreaInsets()
  const { url, title } = route.params
  const webViewRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            navigation.goBack()
          }}
        >
          <Text style={styles.backText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingMask}>
          <ActivityIndicator size="large" color="#E54444" />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        setSupportMultipleWindows={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 17, color: '#E54444', fontWeight: '500' },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  closeBtn: { minWidth: 60, alignItems: 'flex-end' },
  closeText: { fontSize: 16, color: '#999' },
  loadingMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  webview: { flex: 1 },
  urlBar: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  urlText: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace',
  },
})

export default WebViewScreen
