import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { reset } from '@/navigation/navigationService'
import { useAuthRouteStore } from '../stores'

const AuthRoute = ({
  children,
  navReady,
}: {
  children: ReactNode
  navReady: boolean
}) => {
  const isLoggedIn = useAuthRouteStore(s => s.isLoggedIn)
  const prevIsLoggedInRef = useRef<boolean | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // 等待 zustand persist 从 AsyncStorage 恢复状态
  useEffect(() => {
    // 先检查是否已完成（避免漏掉回调）
    if (useAuthRouteStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    // 未完成则监听回调
    const unsub = useAuthRouteStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    // 兜底：500ms 后强制认为已 hydrated，防止永久白屏
    const timer = setTimeout(() => setHydrated(true), 500)
    return () => {
      unsub()
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    // console.log('AuthRoute: 状态变化', {
    //   navReady,
    //   hydrated,
    //   isLoggedIn,
    //   authChecked,
    // })
    // 必须同时满足：导航容器就绪 + persist hydrate 完成
    if (!navReady || !hydrated) return

    console.log('AuthRoute: isLoggedIn 变化', {
      isLoggedIn,
      prev: prevIsLoggedInRef.current,
    })

    // 初始状态处理：无论是否登录，都停留在主页
    if (prevIsLoggedInRef.current === null) {
      prevIsLoggedInRef.current = isLoggedIn
      return
    }

    // 登录状态变化时进行导航
    if (prevIsLoggedInRef.current && !isLoggedIn) {
      console.log('AuthRoute: 登出状态变化，跳转到登录页')
      reset('Login')
    }
    prevIsLoggedInRef.current = isLoggedIn
  }, [isLoggedIn, navReady, hydrated])

  return (
    <View style={styles.container}>
      {children}
      {/* {(!navReady || !hydrated || !authChecked) && <View style={styles.mask} />} */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 9999,
  },
})

export default AuthRoute
