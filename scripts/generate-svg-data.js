const fs = require('fs')
const path = require('path')
const { optimize } = require('svgo')

const animalDir = path.join(__dirname, '../src/assets/svg/animal')
const fruitDir = path.join(__dirname, '../src/assets/svg/fruit')
const commonDir = path.join(__dirname, '../src/assets/svg/common')
const outDir = path.join(__dirname, '../src/components/homeBackground')

const lines = []

const SVGO_CONFIG = {
  plugins: [
    'preset-default',
    'removeComments',
    'removeMetadata',
    'removeTitle',
    'removeDesc',
    'removeUselessDefs',
    'cleanupIds',
  ],
}

const cleanSvg = content => {
  try {
    const result = optimize(content, SVGO_CONFIG)
    return result.data
      .replace(/\bNaN\b/g, '0')
      .replace(/\bundefined\b/g, '0')
      .replace(/calc\([^)]*\)/g, '0')
  } catch {
    return content
      .replace(/\bNaN\b/g, '0')
      .replace(/\bundefined\b/g, '0')
      .replace(/calc\([^)]*\)/g, '0')
  }
}

const addDir = (dir, prefix) => {
  fs.readdirSync(dir)
    .filter(f => f.endsWith('.svg'))
    .forEach((f, i) => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8')
      const content = cleanSvg(raw)
      const escaped = content
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')
      lines.push(`export const ${prefix}${i} = \`${escaped}\``)
    })
}

addDir(animalDir, 'animal')
addDir(fruitDir, 'fruit')
addDir(commonDir, 'common')

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'svgData.ts'), lines.join('\n\n'))
console.log('done, exports:', lines.length)

// 生成固定布局
const SIZES = [40, 48, 56, 64]
const SVG_COUNT = Math.min(30, lines.length)

const seededRand = seed => {
  let s = (seed % 233280) + 1
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const W = 375
const H = 812
const cellSize = 72
const cols = Math.ceil(W / cellSize) + 1
const rows = Math.ceil(H / cellSize) + 1
const rand = seededRand(2025)
const layout = []

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    layout.push({
      svgIndex: Math.floor(rand() * SVG_COUNT),
      x: Math.round((col * cellSize + rand() * 20 - 10) * 100) / 100,
      y: Math.round((row * cellSize + rand() * 20 - 10) * 100) / 100,
      size: SIZES[Math.floor(rand() * SIZES.length)],
      rotate: Math.round(rand() * 360 * 100) / 100,
      opacity: Math.round((0.1 + rand() * 0.1) * 1000) / 1000,
    })
  }
}

const layoutTs = `export interface LayoutItem {
  svgIndex: number
  x: number
  y: number
  size: number
  rotate: number
  opacity: number
}

export const PRESET_LAYOUT: LayoutItem[] = ${JSON.stringify(layout, null, 2)}
`

fs.writeFileSync(path.join(outDir, 'presetLayout.ts'), layoutTs)
console.log('done, layout items:', layout.length)
