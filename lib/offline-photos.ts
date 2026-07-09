const PHOTOS_KEY = 'baby_tracker_offline_photos'
const LOCAL_PREFIX = 'local://'

interface StoredPhoto {
  base64: string
  mime: string
}

function getStore(): Record<string, StoredPhoto> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PHOTOS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStore(store: Record<string, StoredPhoto>) {
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('offline-queue-updated'))
}

export function isLocalPhotoUrl(url: string) {
  return url.startsWith(LOCAL_PREFIX)
}

export function getDisplayPhotoUrl(url: string): string {
  if (!isLocalPhotoUrl(url)) return url
  const id = url.slice(LOCAL_PREFIX.length)
  const photo = getStore()[id]
  if (!photo) return url
  return `data:${photo.mime};base64,${photo.base64}`
}

export async function storeOfflinePhoto(file: File): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const store = getStore()
  store[id] = { base64, mime: file.type || 'image/jpeg' }
  saveStore(store)
  return `${LOCAL_PREFIX}${id}`
}

export function getPendingPhotoIds(): string[] {
  return Object.keys(getStore())
}

async function uploadStoredPhoto(id: string): Promise<string> {
  const store = getStore()
  const photo = store[id]
  if (!photo) throw new Error('Foto offline tidak ditemukan')

  const binary = atob(photo.base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const file = new File([bytes], `offline-${id}.jpg`, { type: photo.mime })

  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Upload foto gagal')
  }
  const { photo_url } = await res.json()
  delete store[id]
  saveStore(store)
  return photo_url as string
}

export async function resolvePhotoUrl(url: string): Promise<string> {
  if (!isLocalPhotoUrl(url)) return url
  const id = url.slice(LOCAL_PREFIX.length)
  return uploadStoredPhoto(id)
}

export async function flushPendingPhotos(): Promise<number> {
  const ids = getPendingPhotoIds()
  let uploaded = 0
  for (const id of ids) {
    await uploadStoredPhoto(id)
    uploaded++
  }
  return uploaded
}
