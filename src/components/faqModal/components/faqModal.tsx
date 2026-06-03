import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native'

interface FaqModalProps {
  visible: boolean
  onClose: () => void
}

const { width } = Dimensions.get('window')

const faqs = [
  {
    q: '为什么点击入口后没有跳转到App？',
    a: '请先确认已安装对应App（如京东、淘宝等）。部分手机需要在设置中允许浏览器调起其他App。',
  },
  {
    q: '浏览器打开后没有弹出"打开京东"的提示？',
    a: '部分浏览器会自动拦截弹窗，您可以手动点击页面中的"打开京东App"按钮，或尝试换一个浏览器打开。',
  },
  {
    q: '优惠券领取失败怎么办？',
    a: '活动优惠券可能已被领完或已过期。您可以稍后再试，或尝试其他入口的活动。',
  },
  {
    q: '为什么有些入口显示"未安装App"？',
    a: '系统检测到您尚未安装对应App，请前往应用商店下载安装后再使用该入口。',
  },
  {
    q: '这些优惠活动是真实的吗？',
    a: '所有入口均为各平台官方CPS活动链接，由平台官方提供，安全可靠。',
  },
  {
    q: '如何查看使用步骤？',
    a: '点击入口列表上方的"使用指引"按钮，即可查看详细的使用步骤说明。',
  },
]

const FaqModal: React.FC<FaqModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 头部 */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>❓</Text>
            <Text style={styles.headerTitle}>常见问题</Text>
          </View>

          {/* 问题列表 */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {faqs.map((item, index) => (
              <View key={index} style={styles.faqItem}>
                <View style={styles.questionRow}>
                  <Text style={styles.qBadge}>Q</Text>
                  <Text style={styles.questionText}>{item.q}</Text>
                </View>
                <View style={styles.answerRow}>
                  <Text style={styles.aBadge}>A</Text>
                  <Text style={styles.answerText}>{item.a}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* 关闭按钮 */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>我知道了</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: width - 48,
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  header: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  qBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    marginRight: 8,
    overflow: 'hidden',
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  aBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF9800',
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    marginRight: 8,
    overflow: 'hidden',
  },
  answerText: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  closeBtn: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {},
    }),
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
})

export default FaqModal
