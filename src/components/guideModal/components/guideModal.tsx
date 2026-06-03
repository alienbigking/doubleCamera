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

interface GuideModalProps {
  visible: boolean
  onClose: () => void
}

const { width } = Dimensions.get('window')

const steps = [
  {
    number: 1,
    title: '点击打开入口',
    desc: '选择心仪的优惠活动，点击卡片上的"打开入口"按钮',
    icon: '👆',
  },
  {
    number: 2,
    title: '跳转浏览器',
    desc: '系统将自动跳转至浏览器打开活动页面，等待页面加载完成',
    icon: '🌐',
  },
  {
    number: 3,
    title: '打开京东 App',
    desc: '如果浏览器顶部出现"打开京东"提示，请点击该按钮；如果没有自动弹出，请手动点击页面上的"打开京东App"',
    icon: '📱',
    highlight: true,
  },
  {
    number: 4,
    title: '领取优惠',
    desc: '成功跳转到京东 App 后，即可自动领取优惠券或享受活动优惠',
    icon: '🎁',
  },
]

const GuideModal: React.FC<GuideModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 顶部装饰 */}
          <View style={styles.headerDecoration}>
            <View style={styles.headerGradient} />
            <Text style={styles.headerEmoji}>✨</Text>
          </View>

          {/* 标题 */}
          <Text style={styles.mainTitle}>使用指引</Text>
          <Text style={styles.subTitle}>以京东为例，其余应用操作方式类似</Text>

          {/* 步骤列表 */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {steps.map((step, index) => (
              <View key={step.number} style={styles.stepRow}>
                {/* 左侧连线 */}
                <View style={styles.leftLine}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>{step.number}</Text>
                  </View>
                  {index < steps.length - 1 && <View style={styles.line} />}
                </View>

                {/* 内容卡片 */}
                <View
                  style={[
                    styles.stepCard,
                    step.highlight && styles.highlightCard,
                  ]}
                >
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                    <Text
                      style={[
                        styles.stepTitle,
                        step.highlight && styles.highlightTitle,
                      ]}
                    >
                      {step.title}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepDesc,
                      step.highlight && styles.highlightDesc,
                    ]}
                  >
                    {step.desc}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* 提示卡片 */}
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              提示：请确保已安装京东 App，如未安装请先前往应用商店下载
            </Text>
          </View>

          {/* 关闭按钮 */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>我知道了</Text>
          </TouchableOpacity>

          {/* 底部装饰 */}
          <View style={styles.bottomDecoration} />
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
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
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
  headerDecoration: {
    height: 100,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: 0,
    backgroundColor: '#66BB6A',
    borderRadius: 100,
    opacity: 0.6,
  },
  headerEmoji: {
    fontSize: 48,
    zIndex: 1,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3320',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  scrollView: {
    maxHeight: 320,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  leftLine: {
    width: 36,
    alignItems: 'center',
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {},
    }),
  },
  numberText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E8F5E9',
    marginTop: 4,
    marginBottom: -8,
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#F8FBF8',
    borderRadius: 16,
    padding: 14,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  highlightCard: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD54F',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD54F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {},
    }),
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3320',
  },
  highlightTitle: {
    color: '#F57C00',
  },
  stepDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  highlightDesc: {
    color: '#795548',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: '#1565C0',
    lineHeight: 16,
  },
  closeBtn: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
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
  bottomDecoration: {
    height: 4,
    backgroundColor: '#4CAF50',
    opacity: 0.2,
  },
})

export default GuideModal
