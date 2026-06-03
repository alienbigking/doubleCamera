import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native'
import { Toast } from 'toastify-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuthRouteStore } from '@/components/authRoute/stores'
import { loginService } from '../services'
import { env } from '@/config'
import type { RootStackParamList } from '@/navigation/appNavigator'
import LoginBackground from './loginBackground'

const Login = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const setToken = useAuthRouteStore(s => s.setToken)
  const setLoggedIn = useAuthRouteStore(s => s.setLoggedIn)
  const [loginMode, setLoginMode] = useState<'password' | 'code'>('password')
  const [username, setUsername] = useState('allen.ouyang')
  const [password, setPassword] = useState('@ouyangWEI6879')
  const [verifyCode, setVerifyCode] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    const credential = loginMode === 'password' ? password : verifyCode

    if (!username || !credential) {
      Toast.error(
        loginMode === 'password'
          ? '请输入用户名和密码'
          : '请输入用户名和验证码',
      )
      return
    }

    if (!agreed) {
      Toast.error('请同意服务条款和隐私权政策')
      return
    }

    setLoading(true)
    try {
      const { status, data, message } = await loginService.login({
        clientId: env.OAUTH_CLIENT_ID,
        clientSecret: env.OAUTH_CLIENT_SECRET,
        userIdentifier: username,
        credential,
        identityType: loginMode === 'password' ? 'password' : 'code',
      })

      console.log('登录响应内容', { status, data, message })
      console.log('获取到的 token:', data?.accessToken)

      if (status === 0) {
        setToken(data?.accessToken)
        console.log('设置后的 store token:', useAuthRouteStore.getState().token)
        setLoggedIn(true)
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
        Toast.success('登录成功！')
      } else {
        Toast.error(message)
      }
    } catch (error: any) {
      const { message: errMsg } = error || {}
      Toast.info(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleGetVerifyCode = () => {
    // 模拟获取验证码：自动填充 123456
    setVerifyCode('123456')
    Toast.success('验证码已发送：123456')
  }

  return (
    <View style={styles.login}>
      <LoginBackground />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.loginBox}>
          <Text style={styles.loginTitle}>登录优惠达人</Text>
          <Text style={styles.loginHint}>� 每天都有优惠等你来拿！</Text>

          {/* 暂时隐藏验证码登录选项，保留代码注释
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'password' && styles.tabActive]}
              onPress={() => setLoginMode('password')}
            >
              <Text
                style={[
                  styles.tabText,
                  loginMode === 'password' && styles.tabTextActive,
                ]}
              >
                密码登录
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginMode === 'code' && styles.tabActive]}
              onPress={() => setLoginMode('code')}
            >
              <Text
                style={[
                  styles.tabText,
                  loginMode === 'code' && styles.tabTextActive,
                ]}
              >
                验证码登录
              </Text>
            </TouchableOpacity>
          </View>
          */}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="输入用户名/手机号/邮箱"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          {/* 暂时隐藏验证码登录，只保留密码登录 */}
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="请输入密码"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              keyboardType="default"
            />
          </View>

          {/* 验证码登录相关代码暂时隐藏
          {loginMode === 'password' ? (
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="请输入密码"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                keyboardType="default"
              />
            </View>
          ) : (
            <View style={styles.verifyCodeContainer}>
              <TextInput
                style={styles.verifyCodeInput}
                placeholder="请输入验证码"
                placeholderTextColor="#999"
                value={verifyCode}
                onChangeText={setVerifyCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <View style={styles.verifyCodeRight}>
                <View style={styles.verifyCodeDivider} />
                <TouchableOpacity onPress={handleGetVerifyCode}>
                  <Text style={styles.verifyCodeBtn}>获取验证码</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          */}

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>
              {loading ? '登录中...' : '登录'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerBtnText}>
              没有账号？<Text style={styles.registerBtnLink}>立即注册</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.agreementContainer}>
            <Pressable
              style={[styles.checkbox, agreed && styles.checkboxChecked]}
              onPress={() => setAgreed(!agreed)}
            >
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
            <Text style={styles.agreementText}>
              已阅读并同意
              <Text style={styles.agreementLink}>《用户协议》</Text>和
              <Text style={styles.agreementLink}>《隐私政策》</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  login: {
    flex: 1,
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0,
    // paddingTop: StatusBar.currentHeight,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 0,
  },
  loginBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    width: '100%',
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: 16,
    color: '#333',
  },
  loginHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#5B54E4',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  tabTextActive: {
    color: '#5B54E4',
    fontWeight: '600',
  },
  // 用户名输入框
  inputContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    paddingHorizontal: 0,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  // 密码输入框
  passwordInputContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 50,
  },
  passwordInput: {
    paddingHorizontal: 0,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  // 验证码输入框
  verifyCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
    minHeight: 50,
  },
  verifyCodeInput: {
    paddingHorizontal: 0,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  verifyCodeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyCodeDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
    marginHorizontal: 16,
  },
  verifyCodeBtn: {
    color: '#5B54E4',
    fontSize: 14,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: '#5B54E4',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerBtn: {
    alignItems: 'center',
    marginBottom: 16,
  },
  registerBtnText: {
    fontSize: 13,
    color: '#999',
  },
  registerBtnLink: {
    color: '#5B54E4',
    fontWeight: '500',
  },
  agreementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5B54E4',
    borderColor: '#5B54E4',
  },
  checkmark: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  agreementText: {
    fontSize: 12,
    color: '#999',
  },
  agreementLink: {
    color: '#5B54E4',
  },
})

export default Login
