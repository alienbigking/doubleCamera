import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '@/pages/settings/stores'

const PrivacyPolicy = () => {
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
        <Text style={styles.title}>隐私政策</Text>
        <Text style={styles.updateDate}>更新日期：2024年5月</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 信息收集</Text>
          <Text style={styles.sectionText}>我们可能会收集以下类型的信息：</Text>
          <Text style={styles.sectionText}>
            • 账户信息：用户名、昵称、头像等
          </Text>
          <Text style={styles.sectionText}>
            • 设备信息：设备型号、操作系统版本等
          </Text>
          <Text style={styles.sectionText}>
            • 使用数据：应用使用情况、偏好设置等
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 信息使用</Text>
          <Text style={styles.sectionText}>
            我们使用收集的信息用于以下目的：
          </Text>
          <Text style={styles.sectionText}>• 提供和维护服务</Text>
          <Text style={styles.sectionText}>• 改进用户体验</Text>
          <Text style={styles.sectionText}>• 发送重要通知</Text>
          <Text style={styles.sectionText}>• 防止欺诈和滥用</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 信息共享</Text>
          <Text style={styles.sectionText}>
            除以下情况外，我们不会与第三方共享您的个人信息：
          </Text>
          <Text style={styles.sectionText}>• 获得您的明确同意</Text>
          <Text style={styles.sectionText}>• 法律法规要求</Text>
          <Text style={styles.sectionText}>• 保护我们的合法权益</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 信息安全</Text>
          <Text style={styles.sectionText}>
            我们采取合理的安全措施来保护您的个人信息，包括：
          </Text>
          <Text style={styles.sectionText}>• 数据加密传输</Text>
          <Text style={styles.sectionText}>• 访问权限控制</Text>
          <Text style={styles.sectionText}>• 定期安全审计</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 您的权利</Text>
          <Text style={styles.sectionText}>您对个人信息享有以下权利：</Text>
          <Text style={styles.sectionText}>• 访问您的个人信息</Text>
          <Text style={styles.sectionText}>• 更正不准确的信息</Text>
          <Text style={styles.sectionText}>• 删除您的账户</Text>
          <Text style={styles.sectionText}>• 撤回同意</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. 联系我们</Text>
          <Text style={styles.sectionText}>
            如对本隐私政策有任何疑问，请通过应用内的帮助与反馈功能联系我们。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. 政策更新</Text>
          <Text style={styles.sectionText}>
            我们可能会不时更新本隐私政策。更新后的政策将在应用内发布，请您定期查看。
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
    marginBottom: 8,
  },
  updateDate: {
    fontSize: 13,
    color: '#999',
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

export default PrivacyPolicy
