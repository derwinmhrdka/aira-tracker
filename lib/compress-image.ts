export async function compressImage(
  file: File,
  maxWidth = 1024,
  initialQuality = 0.72
): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      const encode = (quality: number) =>
        new Promise<Blob | null>((res) => {
          canvas.toBlob((blob) => res(blob), 'image/jpeg', quality)
        })

      const compress = async () => {
        let quality = initialQuality
        let blob = await encode(quality)

        while (blob && blob.size > 450 * 1024 && quality > 0.45) {
          quality -= 0.08
          blob = await encode(quality)
        }

        if (!blob) {
          resolve(file)
          return
        }

        resolve(
          new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
        )
      }

      void compress()
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gagal kompres gambar'))
    }

    img.src = url
  })
}
