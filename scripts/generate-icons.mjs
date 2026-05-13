import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public', 'icons', 'icon.svg')
const svg = readFileSync(svgPath)

mkdirSync(join(root, 'public', 'icons'), { recursive: true })

const icons = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-maskable-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of icons) {
  const outPath = join(root, 'public', 'icons', name)
  await sharp(svg).resize(size, size).png().toFile(outPath)
  console.log(`✓  ${name}  (${size}×${size})`)
}
