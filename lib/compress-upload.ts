import type sharp from 'sharp'

const IMAGE_MAX_EDGE = 1200
const IMAGE_JPEG_QUALITY = 72

export async function compressImageBuffer(
  buffer: Buffer
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    const sharpMod = (await import('sharp')).default as typeof sharp
    const compressed = await sharpMod(buffer)
      .rotate()
      .resize(IMAGE_MAX_EDGE, IMAGE_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
      .toBuffer()

    return { buffer: compressed, ext: 'jpg' }
  } catch {
    return { buffer, ext: 'jpg' }
  }
}
