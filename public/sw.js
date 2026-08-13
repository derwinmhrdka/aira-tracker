/** Bump when deploy needs a hard cache reset. Activate also clears older names. */
const CACHE_NAME = 'baby-tracker-v14'
const STATIC_ASSETS = ['/', '/manifest.json', '/icon.svg']

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

function shouldCache(request, response) {
  if (!response.ok) return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  if (url.pathname.startsWith('/api/')) return false

  if (STATIC_ASSETS.includes(url.pathname)) return true
  if (url.pathname.startsWith('/_next/static/')) return true
  if (url.pathname.startsWith('/icon')) return true
  if (url.pathname === '/manifest.json') return true

  // App shell only — avoid unbounded caching of every navigation URL
  if (request.mode === 'navigate' || request.destination === 'document') {
    return url.pathname === '/'
  }

  return false
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  // Network-first: fresh content when online; cache fallback when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (shouldCache(request, response)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached
          if (request.mode === 'navigate') {
            return caches.match('/')
          }
          return Response.error()
        })
      )
  )
})

self.addEventListener('push', (event) => {
  let data = { title: 'Baby Tracker', body: 'Ada pengingat baru', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // use defaults
  }

  const title = data.title || ''
  const body = data.body || ''
  let tag = 'app-reminder'
  if (title.includes('🥛') || body.includes('Botol') || body.includes('freezer')) {
    tag = 'milk-expiry-reminder'
  } else if (title.includes('popok') || body.includes('popok')) {
    tag = 'diaper-reminder'
  } else if (title.includes('menyusui') || title.includes('🍼')) {
    tag = 'feeding-reminder'
  } else if (title.includes('Vaksin') || title.includes('vaksin')) {
    tag = 'vaccine-reminder'
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('message', (event) => {
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
    return
  }

  if (event.data?.type === 'SHOW_MILK_EXPIRY_REMINDER') {
    const { title, body, tag } = event.data
    self.registration.showNotification(title || '🥛 Cek ASI di freezer', {
      body: body || 'Ada botol yang mendekati batas waktu',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'milk-expiry-reminder',
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
