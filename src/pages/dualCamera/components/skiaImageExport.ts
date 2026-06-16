import ReactNativeBlobUtil from 'react-native-blob-util'
import { ImageFormat, type SkImage } from '@shopify/react-native-skia'

const BYTE_CHUNK_SIZE = 32 * 1024

export const writeSkiaJpegToPath = async (
  image: SkImage,
  outputPath: string,
  quality: number,
) => {
  const encodedBytes = image.encodeToBytes(ImageFormat.JPEG, quality)
  let offset = 0
  let append = false

  try {
    while (offset < encodedBytes.length) {
      const end = Math.min(offset + BYTE_CHUNK_SIZE, encodedBytes.length)
      const chunk = Array.from(encodedBytes.subarray(offset, end))

      if (append) {
        await ReactNativeBlobUtil.fs.appendFile(outputPath, chunk, 'ascii')
      } else {
        await ReactNativeBlobUtil.fs.writeFile(outputPath, chunk, 'ascii')
        append = true
      }

      offset = end
    }

    if (encodedBytes.length === 0) {
      await ReactNativeBlobUtil.fs.writeFile(outputPath, [], 'ascii')
    }
  } catch (error) {
    await ReactNativeBlobUtil.fs.unlink(outputPath).catch(() => undefined)
    throw error
  }
}
