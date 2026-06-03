import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuthRouteStore } from '@/components/authRoute/stores'
import { Toast } from 'toastify-react-native'
import { profileStore } from '../stores'
import { profileService } from '../services'
import type { RootStackParamList } from '@/navigation/appNavigator'
import { useSettingsStore } from '@/pages/settings/stores'

const Profile: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const insets = useSafeAreaInsets()
  const isLoggedIn = useAuthRouteStore(s => s.isLoggedIn)
  const logout = useAuthRouteStore(s => s.logout)
  const appBackground = useSettingsStore(s => s.appBackground)
  const userInfo = profileStore(s => s.userInfo)
  const setUserInfo = profileStore(s => s.setUserInfo)
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    profileService.getMe().then(({ status, data }) => {
      if (status === 0) {
        setUserInfo(data)
        setAvatarError(false)
      }
    })
  }, [isLoggedIn, setUserInfo])

  const handleLogout = () => {
    logout()
    Toast.info('已退出登录')
  }

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
        {isLoggedIn ? (
          <>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() =>
                userInfo && navigation.navigate('EditProfile', { userInfo })
              }
              activeOpacity={0.8}
            >
              <View style={styles.avatar}>
                {userInfo?.avatar &&
                userInfo.avatar.trim() !== '' &&
                !avatarError ? (
                  <Image
                    source={{ uri: userInfo.avatar }}
                    style={styles.avatarImage}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <Text style={styles.avatarText}>👤</Text>
                )}
              </View>
              <View>
                <Text style={styles.username}>
                  {userInfo?.nickname || '加载中...'}
                </Text>
                <Text style={styles.editHint}>点击编辑资料 ›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.menuItemText}>⚙️ 设置</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('HelpFeedback')}
              >
                <Text style={styles.menuItemText}>❓ 帮助与反馈</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('AboutApp')}
              >
                <Text style={styles.menuItemText}>ℹ️ 关于App</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('FollowAccount')}
              >
                <Text style={styles.menuItemText}>📱 关注公众号</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                <Text style={styles.menuItemText}>🔒 隐私政策</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>退出登录</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.guestContainer}>
              <Text style={styles.guestIcon}>👤</Text>
              <Text style={styles.guestTitle}>未登录</Text>
              <Text style={styles.guestSubtitle}>登录后可使用更多功能</Text>
            </View>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginBtnText}>登录 / 注册</Text>
            </TouchableOpacity>

            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.menuItemText}>⚙️ 设置</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('HelpFeedback')}
              >
                <Text style={styles.menuItemText}>❓ 帮助与反馈</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('AboutApp')}
              >
                <Text style={styles.menuItemText}>ℹ️ 关于App</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('FollowAccount')}
              >
                <Text style={styles.menuItemText}>📱 关注公众号</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                <Text style={styles.menuItemText}>🔒 隐私政策</Text>
                <Text style={styles.menuItemArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 22 },
  avatarImage: { width: '100%', height: '100%' },
  username: { fontSize: 18, fontWeight: '600', color: '#333' },
  editHint: { fontSize: 12, color: '#bbb', marginTop: 2 },
  menuContainer: { marginBottom: 40 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: { fontSize: 16, color: '#333' },
  menuItemArrow: { fontSize: 18, color: '#ccc' },
  logoutBtn: {
    backgroundColor: '#ff4757',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  guestIcon: { fontSize: 56, marginBottom: 12 },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  guestSubtitle: { fontSize: 14, color: '#999' },
  loginBtn: {
    backgroundColor: '#E84C5F',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

export default Profile
