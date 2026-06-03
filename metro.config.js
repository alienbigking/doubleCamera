const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname
const srcRoot = path.join(projectRoot, 'src')

const config = {
  watchFolders: [srcRoot],
  resolver: {
    extraNodeModules: {
      '@': srcRoot,
    },
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
