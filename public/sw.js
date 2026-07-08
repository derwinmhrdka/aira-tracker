const CACHE_NAME = 'baby-tracker-v7'
const STATIC_ASSETS = ['/', '/manifest.json', '/icon.svg']

let reminderSettings = {
  feedingEnabled: false,
  feedingIntervalMinutes: 180,
  diaperEnabled: false,
  diaperIntervalMinutes: 180,
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (!response.ok) return response
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
    })
  )
})

self.addEventListener('push', (event) => {
  let data = { title: 'Baby Tracker', body: 'Ada pengingat baru', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // use defaults
  }

  const isDiaper = data.title?.includes('popok')
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: isDiaper ? 'diaper-reminder' : 'feeding-reminder',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_REMINDER_SETTINGS') {
    const incoming = event.data.settings || {}
    reminderSettings = {
      feedingEnabled:
        incoming.feedingEnabled ?? incoming.enabled ?? reminderSettings.feedingEnabled,
      feedingIntervalMinutes:
        incoming.feedingIntervalMinutes ??
        (incoming.feedingIntervalHours != null
          ? Math.round(incoming.feedingIntervalHours * 60)
          : reminderSettings.feedingIntervalMinutes),
      diaperEnabled: incoming.diaperEnabled ?? reminderSettings.diaperEnabled,
      diaperIntervalMinutes:
        incoming.diaperIntervalMinutes ??
        (incoming.diaperIntervalHours != null
          ? Math.round(incoming.diaperIntervalHours * 60)
          : reminderSettings.diaperIntervalMinutes),
    }
    return
  }

  if (event.data?.type === 'SHOW_FEEDING_REMINDER') {
    const { title, body, tag } = event.data
    self.registration.showNotification(title || 'Waktunya menyusui 🍼', {
      body: body || 'Sudah waktunya cek jadwal menyusui',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'feeding-reminder',
      vibrate: [200, 100, 200],
      data: { url: '/' },
    })
    return
  }

  if (event.data?.type === 'SHOW_DIAPER_REMINDER') {
    const { title, body, tag } = event.data
    self.registration.showNotification(title || 'Waktunya popok', {
      body: body || 'Sudah waktunya cek popok',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'diaper-reminder',
      vibrate: [200, 100, 200],
      data: { url: '/' },
    })
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url })
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
