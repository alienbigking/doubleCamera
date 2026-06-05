import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Slider from '@react-native-community/slider'
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static'

export type ExposureRange = {
  min: number
  max: number
  supported: boolean
}

const formatExposure = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(1)}`

// 曝光控制弹框组件：分别调整后置和前置摄像头的曝光补偿。
export const ExposureControlPanel = ({
  rearExposure,
  frontExposure,
  rearRange,
  frontRange,
  onChangeRearExposure,
  onChangeFrontExposure,
  onResetRearExposure,
  onResetFrontExposure,
  onClose,
}: {
  rearExposure: number
  frontExposure: number
  rearRange: ExposureRange
  frontRange: ExposureRange
  onChangeRearExposure: (value: number) => void
  onChangeFrontExposure: (value: number) => void
  onResetRearExposure: () => void
  onResetFrontExposure: () => void
  onClose: () => void
}) => (
  <View style={styles.panel}>
    <View style={styles.header}>
      <View style={styles.titleGroup}>
        <MaterialIcons
          name="wb-sunny"
          color="rgba(255,255,255,0.9)"
          size={27}
        />
        <Text style={styles.title}>曝光</Text>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        activeOpacity={0.75}
        onPress={onClose}
      >
        <MaterialIcons name="close" color="rgba(255,255,255,0.92)" size={28} />
      </TouchableOpacity>
    </View>
    <ExposureSliderRow
      value={rearExposure}
      range={rearRange}
      onChange={onChangeRearExposure}
      onReset={onResetRearExposure}
    />
    <ExposureSliderRow
      value={frontExposure}
      range={frontRange}
      onChange={onChangeFrontExposure}
      onReset={onResetFrontExposure}
    />
  </View>
)

const ExposureSliderRow = ({
  value,
  range,
  onChange,
  onReset,
}: {
  value: number
  range: ExposureRange
  onChange: (value: number) => void
  onReset: () => void
}) => (
  <View style={[styles.row, !range.supported && styles.rowDisabled]}>
    <Text style={styles.value}>{formatExposure(value)}</Text>
    <Slider
      style={styles.slider}
      value={value}
      minimumValue={range.min}
      maximumValue={range.max}
      step={0.1}
      disabled={!range.supported}
      minimumTrackTintColor="#e7ad3d"
      maximumTrackTintColor="rgba(255,255,255,0.22)"
      thumbTintColor="#fff"
      onValueChange={onChange}
    />
    <TouchableOpacity
      style={styles.resetButton}
      activeOpacity={0.75}
      disabled={!range.supported}
      onPress={onReset}
    >
      <MaterialIcons name="refresh" color="rgba(255,255,255,0.46)" size={29} />
    </TouchableOpacity>
  </View>
)

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 32,
    right: 32,
    top: '50%',
    transform: [{ translateY: -118 }],
    zIndex: 20,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
    backgroundColor: 'rgba(22,24,29,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  header: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '400',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDisabled: {
    opacity: 0.42,
  },
  value: {
    width: 76,
    color: '#fff',
    fontSize: 24,
    fontWeight: '400',
  },
  slider: {
    flex: 1,
    height: 46,
  },
  resetButton: {
    width: 44,
    height: 44,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
