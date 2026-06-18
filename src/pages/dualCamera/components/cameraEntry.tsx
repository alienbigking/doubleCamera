import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'
import { reset } from '@/navigation/navigationService'

const CameraEntry = () => (
  <View style={styles.root}>
    <View style={styles.header}>
      <Text style={styles.title}>小熊双摄</Text>
      <Text style={styles.subtitle}>选择要启动的相机管线</Text>
    </View>

    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.actionCard}
        activeOpacity={0.82}
        onPress={() => reset('Camera')}
      >
        <View style={styles.iconCircle}>
          <MaterialIcons name="photo-camera" color="#fff" size={30} />
        </View>
        <View style={styles.actionTextBlock}>
          <Text style={styles.actionTitle}>主相机</Text>
          <Text style={styles.actionDescription}>
            启动现有拍照、录像、滤镜和专业模式
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          color="rgba(255,255,255,0.72)"
          size={26}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        activeOpacity={0.82}
        onPress={() => reset('NativeDualCameraTest')}
      >
        <View style={styles.iconCircle}>
          <MaterialIcons name="science" color="#fff" size={30} />
        </View>
        <View style={styles.actionTextBlock}>
          <Text style={styles.actionTitle}>原生双摄测试</Text>
          <Text style={styles.actionDescription}>
            独立启动原生 MultiCam，不加载旧相机会话
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          color="rgba(255,255,255,0.72)"
          size={26}
        />
      </TouchableOpacity>
    </View>
  </View>
)

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#050607',
  },
  header: {
    marginBottom: 34,
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
  },
  actions: {
    gap: 14,
  },
  actionCard: {
    minHeight: 94,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  actionDescription: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 17,
  },
})

export default CameraEntry
