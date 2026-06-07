module.exports = {
  dependencies: {
    'react-native-iap': {
      platforms: {
        android: null, // 禁用 Android 平台的依赖
      },
    },
    '@sayem314/react-native-keep-awake': {
      platforms: {
        ios: null,
      },
    },
    // 'react-native-geolocation-service':{
    //     platforms: {
    //         android: null, // 禁用 Android 平台的依赖
    //     },
    // }
    // 'react-native-track-player':{
    //     platforms: {
    //         android: null, // 禁用 Android 平台的依赖
    //     },
    // }
  },
}
