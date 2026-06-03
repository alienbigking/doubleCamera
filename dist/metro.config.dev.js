'use strict'

var _require = require('@react-native/metro-config'),
  getDefaultConfig = _require.getDefaultConfig,
  mergeConfig = _require.mergeConfig
/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

var config = {}
module.exports = mergeConfig(getDefaultConfig(__dirname), config)
