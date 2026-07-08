import sharp from 'sharp'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const source = join(root, 'public/icon-source.png')

if (!existsSync(source)) {
  console.error('Missing public/icon-source.png — add the baby icon image first.')
  process.exit(1)
}

function circleMask(size) {
  const r = size / 2
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
    </svg>`
  )
}

async function writeCircularIcon(size, filename) {
  const out = join(root, `public/${filename}`)
  const mask = circleMask(size)

  await sharp(source)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .composite([{ input: mask, blend: 'dest-in' }])
    .toFile(out)

  console.log(`Wrote ${out}`)
}

const sizes = [
  [32, 'icon-32.png'],
  [180, 'apple-touch-icon.png'],
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
]

for (const [size, name] of sizes) {
  await writeCircularIcon(size, name)
}
