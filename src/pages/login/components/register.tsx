import React, { useState, useRef } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Toast } from 'toastify-react-native'
import { loginService } from '../services'
import LoginBackground from './loginBackground'

const Register = () => {
  const navigation = useNavigation()
  const [phone] = useState('')
  // const [smsCode, setSmsCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCountdown = () => {
    setCountdown(60)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          countdownRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (countdown > 0 || sendingCode) return
    if (!phone) {
      Toast.error('请先输入手机号')
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Toast.error('手机号格式不正确')
      return
    }
    setSendingCode(true)
    const { status, message } = await loginService.sendSmsCode({ phone })
    setSendingCode(false)
    if (status !== 0) {
      Toast.error(message)
      return
    }
    Toast.success('验证码已发送')
    startCountdown()
  }

  const handleRegister = async () => {
    const trimmedPhone = phone.trim()
    const trimmedUsername = username.trim()

    // if (!trimmedPhone && !trimmedUsername) {
    //   Toast.error('手机号和用户名至少填一个')
    //   return
    // }
    // if (trimmedPhone && !/^1[3-9]\d{9}$/.test(trimmedPhone)) {
    //   Toast.error('手机号格式不正确')
    //   return
    // }
    if (!trimmedUsername) {
      Toast.error('请输入用户名')
      return
    }
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(trimmedUsername)) {
      Toast.error('用户名格式不正确（3-20位字母数字下划线点号）')
      return
    }
    if (!password || !confirmPassword) {
      Toast.error('请填写密码')
      return
    }
    if (password.length < 6) {
      Toast.error('密码不能少于6位')
      return
    }
    if (password !== confirmPassword) {
      Toast.error('两次密码不一致')
      return
    }
    if (!agreed) {
      Toast.error('请同意用户协议和隐私政策')
      return
    }

    setLoading(true)
    try {
      const { status, message } = await loginService.register({
        // phone: trimmedPhone || undefined,
        password,
        username: trimmedUsername,
        nickname: nickname.trim() || undefined,
        // phoneCode: trimmedPhone && smsCode ? smsCode : undefined,
      })
      if (status !== 0) {
        Toast.error(message)
        return
      }
      Toast.success('注册成功，请登录')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <LoginBackground />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.box}>
          <Text style={styles.title}>创建账号</Text>
          <Text style={styles.subtitle}>😊 欢迎加入，记录美好每一天</Text>

          {/* 暂时隐藏手机号和验证码输入框，保留代码注释
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="手机号（与用户名至少填一个）"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <View style={styles.codeWrap}>
            <TextInput
              style={styles.codeInput}
              placeholder="短信验证码"
              placeholderTextColor="#999"
              value={smsCode}
              onChangeText={setSmsCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <View style={styles.codeDivider} />
            <TouchableOpacity
              onPress={handleSendCode}
              disabled={countdown > 0 || sendingCode}
            >
              {sendingCode ? (
                <ActivityIndicator size="small" color="#5B54E4" />
              ) : (
                <Text
                  style={[
                    styles.codeBtn,
                    countdown > 0 && styles.codeBtnDisabled,
                  ]}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          */}

          {/* 用户名 */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="用户名（3-20位字母数字下划线）"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              maxLength={20}
            />
          </View>

          {/* 昵称（选填） */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="昵称（选填）"
              placeholderTextColor="#999"
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
            />
          </View>

          {/* 密码 */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="密码（不少于6位）"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* 确认密码 */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="确认密码"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          {/* 注册按钮 */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRegister}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>注 册</Text>
            )}
          </TouchableOpacity>

          {/* 协议 */}
          <View style={styles.agreementRow}>
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

          {/* 返回登录 */}
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>
              已有账号？<Text style={styles.backLink}>去登录</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    textAlign: 'center',
  },
  inputWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 14,
  },
  input: {
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 14,
  },
  codeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  codeDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#ddd',
    marginHorizontal: 14,
  },
  codeBtn: {
    color: '#5B54E4',
    fontSize: 14,
    fontWeight: '500',
  },
  codeBtnDisabled: {
    color: '#bbb',
  },
  submitBtn: {
    backgroundColor: '#5B54E4',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 4,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  backRow: {
    alignItems: 'center',
  },
  backText: {
    fontSize: 13,
    color: '#999',
  },
  backLink: {
    color: '#5B54E4',
    fontWeight: '500',
  },
})

export default Register
