const AUDIO_KEY = 'baby_tracker_offline_audio'
const LOCAL_PREFIX = 'local-audio://'

interface StoredAudio {
  base64: string
  mime: string
}

function getStore(): Record<string, StoredAudio> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(AUDIO_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStore(store: Record<string, StoredAudio>) {
  localStorage.setItem(AUDIO_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('offline-queue-updated'))
}

export function isLocalAudioUrl(url: string) {
  return url.startsWith(LOCAL_PREFIX)
}

export function getDisplayAudioUrl(url: string): string {
  if (!isLocalAudioUrl(url)) return url
  const id = url.slice(LOCAL_PREFIX.length)
  const audio = getStore()[id]
  if (!audio) return url
  return `data:${audio.mime};base64,${audio.base64}`
}

export async function storeOfflineAudio(file: File): Promise<string> {
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
  store[id] = { base64, mime: file.type || 'audio/webm' }
  saveStore(store)
  return `${LOCAL_PREFIX}${id}`
}

export function getPendingAudioIds(): string[] {
  return Object.keys(getStore())
}

async function uploadStoredAudio(id: string): Promise<string> {
  const store = getStore()
  const audio = store[id]
  if (!audio) throw new Error('Audio offline tidak ditemukan')

  const binary = atob(audio.base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const ext = audio.mime.includes('mp4') ? 'm4a' : 'webm'
  const file = new File([bytes], `offline-${id}.${ext}`, { type: audio.mime })

  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Upload audio gagal')
  }
  const { audio_url } = await res.json()
  delete store[id]
  saveStore(store)
  return audio_url as string
}

export async function resolveAudioUrl(url: string): Promise<string> {
  if (!isLocalAudioUrl(url)) return url
  const id = url.slice(LOCAL_PREFIX.length)
  return uploadStoredAudio(id)
}

export async function flushPendingAudio(): Promise<number> {
  const ids = getPendingAudioIds()
  let uploaded = 0
  for (const id of ids) {
    await uploadStoredAudio(id)
    uploaded++
  }
  return uploaded
}
