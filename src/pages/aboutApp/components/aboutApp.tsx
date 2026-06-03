import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '@/pages/settings/stores'

const AboutApp = () => {
  const insets = useSafeAreaInsets()
  const appBackground = useSettingsStore(s => s.appBackground)

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: appBackground },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>关于优惠达人</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>应用简介</Text>
          <Text style={styles.sectionText}>
            优惠达人是一款聚合各大平台优惠入口的应用，帮助用户快速直达官方活动页面，享受更多优惠福利。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>功能特色</Text>
          <Text style={styles.sectionText}>
            • 聚合京东、淘宝、美团、饿了么等主流平台优惠入口
          </Text>
          <Text style={styles.sectionText}>
            • 一键直达官方活动页面，安全可靠
          </Text>
          <Text style={styles.sectionText}>• 实时更新最新优惠活动信息</Text>
          <Text style={styles.sectionText}>• 简洁易用的界面设计</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>支持平台</Text>
          <Text style={styles.sectionText}>• 京东</Text>
          <Text style={styles.sectionText}>• 淘宝</Text>
          <Text style={styles.sectionText}>• 美团</Text>
          <Text style={styles.sectionText}>• 饿了么</Text>
          <Text style={styles.sectionText}>• 滴滴出行</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>版本信息</Text>
          <Text style={styles.sectionText}>当前版本：1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>联系我们</Text>
          <Text style={styles.sectionText}>
            如有问题或建议，欢迎通过帮助与反馈联系我们。
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
})

export default AboutApp
