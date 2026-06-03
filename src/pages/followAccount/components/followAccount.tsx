import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '@/pages/settings/stores'

const FollowAccount = () => {
  const insets = useSafeAreaInsets()
  const appBackground = useSettingsStore(s => s.appBackground)

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: appBackground },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>极</Text>
          </View>
        </View>

        <Text style={styles.title}>关注公众号</Text>
        <Text style={styles.accountName}>极限创意</Text>

        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrText}>📱</Text>
            <Text style={styles.qrHint}>二维码区域</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>关注方式</Text>
          <Text style={styles.infoText}>1. 打开微信扫一扫</Text>
          <Text style={styles.infoText}>2. 扫描上方二维码</Text>
          <Text style={styles.infoText}>3. 点击关注即可</Text>
        </View>

        <View style={styles.tipSection}>
          <Text style={styles.tipTitle}>💡 温馨提示</Text>
          <Text style={styles.tipText}>
            关注"极限创意"公众号，获取更多优惠资讯和活动信息
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E54444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  accountName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#E54444',
    marginBottom: 40,
  },
  qrContainer: {
    marginBottom: 32,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  qrText: {
    fontSize: 48,
    marginBottom: 8,
  },
  qrHint: {
    fontSize: 14,
    color: '#999',
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  tipSection: {
    width: '100%',
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 16,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E54444',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
})

export default FollowAccount
