import React from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import {
  Svg,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Rect,
  Ellipse,
} from 'react-native-svg'

const { width: SW, height: SH } = Dimensions.get('screen')

const STARS = [
  { x: 0.08, y: 0.06, r: 1.8, o: 0.9 },
  { x: 0.22, y: 0.12, r: 1.2, o: 0.7 },
  { x: 0.65, y: 0.04, r: 2.0, o: 0.8 },
  { x: 0.78, y: 0.09, r: 1.4, o: 0.6 },
  { x: 0.92, y: 0.22, r: 1.6, o: 0.85 },
  { x: 0.15, y: 0.28, r: 1.0, o: 0.5 },
  { x: 0.45, y: 0.18, r: 1.8, o: 0.75 },
  { x: 0.88, y: 0.36, r: 1.2, o: 0.6 },
  { x: 0.05, y: 0.52, r: 1.5, o: 0.7 },
  { x: 0.32, y: 0.44, r: 1.0, o: 0.55 },
  { x: 0.72, y: 0.55, r: 1.8, o: 0.8 },
  { x: 0.58, y: 0.68, r: 1.3, o: 0.65 },
  { x: 0.1, y: 0.74, r: 1.6, o: 0.7 },
  { x: 0.85, y: 0.7, r: 1.1, o: 0.6 },
  { x: 0.42, y: 0.82, r: 2.0, o: 0.85 },
  { x: 0.62, y: 0.88, r: 1.4, o: 0.6 },
  { x: 0.25, y: 0.93, r: 1.2, o: 0.5 },
  { x: 0.9, y: 0.88, r: 1.7, o: 0.75 },
]

const LoginBackground = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
      <Defs>
        {/* 主背景：左上橙黄 → 右上珊瑚 → 左下品红 → 右下青紫蓝 */}
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF8C00" stopOpacity="1" />
          <Stop offset="0.3" stopColor="#FF5F7E" stopOpacity="1" />
          <Stop offset="0.6" stopColor="#FF2DAA" stopOpacity="1" />
          <Stop offset="1" stopColor="#7B5FD4" stopOpacity="1" />
        </LinearGradient>
        {/* 右上珊瑚补光 */}
        <RadialGradient id="g1" cx="90%" cy="5%" rx="55%" ry="45%">
          <Stop offset="0" stopColor="#FFAB76" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#FFAB76" stopOpacity="0" />
        </RadialGradient>
        {/* 左上橙黄核心 */}
        <RadialGradient id="g2" cx="5%" cy="5%" rx="50%" ry="42%">
          <Stop offset="0" stopColor="#FFD060" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#FFD060" stopOpacity="0" />
        </RadialGradient>
        {/* 中部品红光晕 */}
        <RadialGradient id="g3" cx="50%" cy="50%" rx="50%" ry="40%">
          <Stop offset="0" stopColor="#FF3DB4" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#FF3DB4" stopOpacity="0" />
        </RadialGradient>
        {/* 右下青紫蓝光晕 */}
        <RadialGradient id="g4" cx="95%" cy="95%" rx="60%" ry="50%">
          <Stop offset="0" stopColor="#6EC6FF" stopOpacity="0.55" />
          <Stop offset="0.5" stopColor="#7B5FD4" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#7B5FD4" stopOpacity="0" />
        </RadialGradient>
        {/* 左下品红补色 */}
        <RadialGradient id="g5" cx="0%" cy="90%" rx="45%" ry="38%">
          <Stop offset="0" stopColor="#FF5FA0" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#FF5FA0" stopOpacity="0" />
        </RadialGradient>
        {/* 顶部白光高光 */}
        <RadialGradient id="g6" cx="48%" cy="0%" rx="42%" ry="25%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        {/* 斜向主扫光 */}
        <LinearGradient id="sh1" x1="0" y1="0.15" x2="1" y2="0.85">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.06" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.2" />
          <Stop offset="0.58" stopColor="#FFFFFF" stopOpacity="0.06" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        {/* 反向粉色扫光 */}
        <LinearGradient id="sh2" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB3DE" stopOpacity="0" />
          <Stop offset="0.45" stopColor="#FFB3DE" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#FFB3DE" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* 底色 */}
      <Rect width={SW} height={SH} fill="url(#bg)" />
      {/* 6层光晕 */}
      <Rect width={SW} height={SH} fill="url(#g1)" />
      <Rect width={SW} height={SH} fill="url(#g2)" />
      <Rect width={SW} height={SH} fill="url(#g3)" />
      <Rect width={SW} height={SH} fill="url(#g4)" />
      <Rect width={SW} height={SH} fill="url(#g5)" />
      <Rect width={SW} height={SH} fill="url(#g6)" />

      {/* 气泡 */}
      <Ellipse
        cx={SW * 0.08}
        cy={SH * 0.28}
        rx={SW * 0.38}
        ry={SW * 0.38}
        fill="#FF6B35"
        fillOpacity={0.12}
      />
      <Ellipse
        cx={SW * 0.92}
        cy={SH * 0.18}
        rx={SW * 0.32}
        ry={SW * 0.32}
        fill="#FF9FD2"
        fillOpacity={0.14}
      />
      <Ellipse
        cx={SW * 0.12}
        cy={SH * 0.75}
        rx={SW * 0.26}
        ry={SW * 0.26}
        fill="#FF2DAA"
        fillOpacity={0.12}
      />
      <Ellipse
        cx={SW * 0.9}
        cy={SH * 0.72}
        rx={SW * 0.28}
        ry={SW * 0.28}
        fill="#7B9FFF"
        fillOpacity={0.15}
      />
      <Ellipse
        cx={SW * 0.5}
        cy={SH * 0.48}
        rx={SW * 0.16}
        ry={SW * 0.16}
        fill="#FFFFFF"
        fillOpacity={0.05}
      />

      {/* 扫光 */}
      <Rect width={SW} height={SH} fill="url(#sh1)" />
      <Rect width={SW} height={SH} fill="url(#sh2)" />

      {/* 星光点 */}
      {STARS.map((s, i) => (
        <Ellipse
          key={i}
          cx={SW * s.x}
          cy={SH * s.y}
          rx={s.r}
          ry={s.r}
          fill="#FFFFFF"
          fillOpacity={s.o}
        />
      ))}
    </Svg>

    {/* 玻璃折射线 */}
    <View style={bgStyles.strip1} />
    <View style={bgStyles.strip2} />
    <View style={bgStyles.strip3} />
    <View style={bgStyles.strip4} />
    {/* 左侧彩色玻璃竖条 */}
    <View style={bgStyles.colorBar1} />
    <View style={bgStyles.colorBar2} />
    {/* 顶部毛玻璃高光弧 */}
    <View style={bgStyles.glassArc} />
  </View>
)

const bgStyles = StyleSheet.create({
  strip1: {
    position: 'absolute',
    top: '12%',
    left: '-5%',
    width: '115%',
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-18deg' }],
  },
  strip2: {
    position: 'absolute',
    top: '17%',
    left: '-5%',
    width: '80%',
    height: 0.8,
    backgroundColor: 'rgba(255,200,150,0.2)',
    transform: [{ rotate: '-18deg' }],
  },
  strip3: {
    position: 'absolute',
    top: '52%',
    left: '10%',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,180,220,0.15)',
    transform: [{ rotate: '-18deg' }],
  },
  strip4: {
    position: 'absolute',
    top: '72%',
    left: '-10%',
    width: '70%',
    height: 0.8,
    backgroundColor: 'rgba(180,160,255,0.15)',
    transform: [{ rotate: '-18deg' }],
  },
  colorBar1: {
    position: 'absolute',
    top: '25%',
    left: 0,
    width: 2.5,
    height: '20%',
    backgroundColor: 'rgba(255,160,80,0.4)',
    borderRadius: 2,
  },
  colorBar2: {
    position: 'absolute',
    top: '55%',
    right: 0,
    width: 2.5,
    height: '15%',
    backgroundColor: 'rgba(180,140,255,0.35)',
    borderRadius: 2,
  },
  glassArc: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: 'rgba(255,200,150,0.08)',
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },
})

export default LoginBackground
