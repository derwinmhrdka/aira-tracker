import { isLocalPhotoUrl, resolvePhotoUrl, flushPendingPhotos } from '@/lib/offline-photos'
import { isLocalAudioUrl, resolveAudioUrl, flushPendingAudio } from '@/lib/offline-audio'

const QUEUE_KEY = 'baby_tracker_offline_queue'

export interface QueuedRequest {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
  createdAt: number
}

const QUEUEABLE_PREFIXES = [
  '/api/logs/diaper',
  '/api/logs/feeding',
  '/api/logs/sleep',
  '/api/notes',
]

export function isQueueableUrl(url: string, method: string) {
  if (method !== 'POST') return false
  return QUEUEABLE_PREFIXES.some((p) => url.startsWith(p))
}

export function getQueue(): QueuedRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedRequest[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent('offline-queue-updated'))
}

export function enqueue(item: Omit<QueuedRequest, 'id' | 'createdAt'>) {
  const queue = getQueue()
  queue.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  })
  saveQueue(queue)
}

export function queueLength() {
  return getQueue().length
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  await flushPendingPhotos().catch(() => {})
  await flushPendingAudio().catch(() => {})

  const queue = getQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  const remaining: QueuedRequest[] = []

  for (const item of queue) {
    try {
      let body = item.body
      if (body && item.url.startsWith('/api/notes')) {
        const parsed = JSON.parse(body) as {
          photo_url?: string
          audio_url?: string
          content?: string
        }
        if (parsed.photo_url && isLocalPhotoUrl(parsed.photo_url)) {
          const serverUrl = await resolvePhotoUrl(parsed.photo_url)
          parsed.photo_url = serverUrl
        }
        if (parsed.audio_url && isLocalAudioUrl(parsed.audio_url)) {
          const serverUrl = await resolveAudioUrl(parsed.audio_url)
          parsed.audio_url = serverUrl
        }
        body = JSON.stringify(parsed)
      }

      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body,
      })
      if (res.ok) {
        synced++
      } else if (res.status === 401) {
        remaining.push(item, ...queue.slice(queue.indexOf(item) + 1))
        break
      } else {
        remaining.push(item)
      }
    } catch {
      remaining.push(item, ...queue.slice(queue.indexOf(item) + 1))
      break
    }
  }

  saveQueue(remaining)
  return { synced, failed: remaining.length }
}

export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

export function isNetworkFailure(err: unknown) {
  return (
    err instanceof TypeError ||
    (err instanceof Error && err.message === 'Failed to fetch')
  )
}
