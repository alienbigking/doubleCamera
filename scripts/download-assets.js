const fs = require('fs')
const path = require('path')
const https = require('https')

// 确保目录存在
const assetsDir = path.join(__dirname, '../src/assets/images')
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

// 下载图片函数
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(assetsDir, filename)
    const file = fs.createWriteStream(filePath)

    https
      .get(url, response => {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          console.log(`✅ Downloaded: ${filename}`)
          resolve(filePath)
        })
      })
      .on('error', err => {
        fs.unlink(filePath, () => {})
        console.error(`❌ Error downloading ${filename}:`, err.message)
        reject(err)
      })
  })
}

// 下载登录背景图片
async function downloadLoginBackground() {
  try {
    // 下载紫色渐变背景图片（更可靠的 URL）
    const loginBgUrl =
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=1200&fit=crop&auto=format'
    await downloadImage(loginBgUrl, '2.png')

    console.log('🎉 Login background downloaded successfully!')
    console.log('📍 Location: src/assets/images/2.png')
  } catch (error) {
    console.error('💥 Failed to download login background:', error.message)
  }
}

// 执行下载
downloadLoginBackground()
