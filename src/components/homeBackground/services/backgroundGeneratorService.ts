import RNFS from 'react-native-fs'

const OUTPUT_FILENAME = 'home_background.png'

export const getBackgroundImagePath = (): string =>
  `${RNFS.DocumentDirectoryPath}/${OUTPUT_FILENAME}`

export const backgroundImageExists = (): Promise<boolean> =>
  RNFS.exists(getBackgroundImagePath())

export const deleteBackgroundImage = (): Promise<void> =>
  RNFS.unlink(getBackgroundImagePath()).catch(() => undefined)
