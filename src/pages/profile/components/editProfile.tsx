import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Toast } from 'toastify-react-native'
import { launchImageLibrary } from 'react-native-image-picker'
import { profileStore } from '../stores'
import { profileService } from '../services'
import { env } from '@/config'
import type { UserInfo } from '../types'

interface EditProfileProps {
  route: { params: { userInfo: UserInfo } }
}

const EditProfile: React.FC<EditProfileProps> = ({ route }) => {
  const { userInfo } = route.params
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const setUserInfo = profileStore(s => s.setUserInfo)

  const [nickname, setNickname] = useState(userInfo.nickname || '')
  const [avatar, setAvatar] = useState(userInfo.avatar || '')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  const hasChanged =
    nickname.trim() !== (userInfo.nickname || '') ||
    avatar !== (userInfo.avatar || '')

  const handlePickAvatar = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, maxWidth: 512, maxHeight: 512 },
      async response => {
        if (response.didCancel || response.errorCode) return
        const asset = response.assets?.[0]
        if (!asset?.uri) return
        const assetUri = asset.uri
        setUploading(true)
        try {
          const { status, data, message } = await profileService.uploadAvatar(
            assetUri,
            asset.fileName || 'avatar.jpg',
            asset.type || 'image/jpeg',
          )
          if (status !== 0 || !data?.url) {
            Toast.error(message || '上传失败')
            return
          }
          setAvatar(`${env.HOST_API_URL}${data.url}`)
          setAvatarError(false)
        } finally {
          setUploading(false)
        }
      },
    )
  }

  const handleSave = async () => {
    if (!nickname.trim()) {
      Toast.error('昵称不能为空')
      return
    }
    if (nickname.trim().length > 20) {
      Toast.error('昵称不能超过20个字符')
      return
    }
    setSubmitting(true)
    try {
      const { status, data, message } = await profileService.updateMe({
        nickname: nickname.trim(),
        avatar: avatar || undefined,
      })
      if (status !== 0) {
        Toast.error(message)
        return
      }
      setUserInfo(data)
      Toast.success('保存成功')
      navigation.goBack()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>编辑资料</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanged || submitting}
            style={styles.saveBtn}
          >
            <Text
              style={[
                styles.saveText,
                (!hasChanged || submitting) && styles.saveTextDisabled,
              ]}
            >
              {submitting ? '保存中' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.avatarSection}
            onPress={handlePickAvatar}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <View style={styles.avatarWrapper}>
              {uploading ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator color="#E84C5F" />
                </View>
              ) : avatar && !avatarError ? (
                <Image
                  source={{ uri: avatar }}
                  style={styles.avatarImage}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>👤</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditIcon}>📷</Text>
              </View>
            </View>
            <Text style={styles.avatarHint}>
              {uploading ? '上传中...' : '点击更换头像'}
            </Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>昵称</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="请输入昵称"
                placeholderTextColor="#bbb"
                maxLength={20}
                returnKeyType="done"
              />
              <Text style={styles.fieldCount}>{nickname.length}/20</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 64 },
  backText: { fontSize: 18, color: '#E84C5F' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
  saveBtn: { width: 64, alignItems: 'flex-end' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#E84C5F' },
  saveTextDisabled: { color: '#ccc' },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 36 },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginBottom: 10,
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E84C5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditIcon: { fontSize: 13 },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { fontSize: 40 },
  avatarHint: { fontSize: 12, color: '#bbb' },
  form: { gap: 24 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  fieldCount: { fontSize: 12, color: '#bbb', textAlign: 'right' },
})

export default EditProfile
