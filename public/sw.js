/** Bump the shell name on each deploy so the new app takes control. */
const SHELL_CACHE = 'baby-tracker-shell-v16'
/** Baby art stays across deploys. Bump only when those files change. */
const MEDIA_CACHE = 'baby-tracker-media-v1'
const STATIC_ASSETS = ['/manifest.json', '/icon.svg']
const MEDIA_ASSETS = [
  '/kms-baby/baby-kurang.jpg',
  '/kms-baby/baby-kurang-shut.jpg',
  '/kms-baby/baby-normal.jpg',
  '/kms-baby/baby-normal-shut.jpg',
  '/kms-baby/baby-lebih.jpg',
  '/kms-baby/baby-lebih-shut.jpg',
  '/kms-baby/baby-obesitas.jpg',
  '/kms-baby/baby-obesitas-shut.jpg',
  '/kms-baby/react-kurang.mp4',
  '/kms-baby/react-normal.mp4',
  '/kms-baby/react-lebih.mp4',
  '/kms-baby/react-obesitas.mp4',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE)
      await shell.addAll(STATIC_ASSETS)
      const media = await caches.open(MEDIA_CACHE)
      await Promise.all(
        MEDIA_ASSETS.map(async (path) => {
          if (await media.match(path)) return
          try {
            await media.add(path)
          } catch {
            // A failed video must not block the new app from installing.
          }
        })
      )
    })()
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== MEDIA_CACHE)
          .map((key) => caches.delete(key))
      )
      await self.clients.claim()
    })()
  )
})

async function mediaFirst(request) {
  const cache = await caches.open(MEDIA_CACHE)
  const path = new URL(request.url).pathname
  const cached = await cache.match(path)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok && !response.redirected && !request.headers.has('range')) {
      await cache.put(path, response.clone())
    }
    return response
  } catch {
    return Response.error()
  }
}

function shouldCache(request, response) {
  if (!response.ok || response.redirected) return false
  const url = new URL(request.url)
  const finalUrl = new URL(response.url)
  if (url.origin !== self.location.origin) return false
  if (finalUrl.pathname.startsWith('/login')) return false
  if (url.pathname.startsWith('/api/')) return false

  if (STATIC_ASSETS.includes(url.pathname)) return true
  if (url.pathname.startsWith('/_next/static/')) return true
  if (url.pathname.startsWith('/icon')) return true
  if (url.pathname === '/manifest.json') return true

  // Only cache the signed-in home document, never a login redirect.
  if (request.mode === 'navigate' || request.destination === 'document') {
    return url.pathname === '/' && finalUrl.pathname === '/'
  }

  return false
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.pathname === '/sw.js') return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/kms-baby/')) {
    event.respondWith(mediaFirst(request))
    return
  }
  if (url.pathname === '/login' || url.pathname.startsWith('/login/')) return
  // Dev HMR and RSC streams must reach the browser directly. Wrapping them
  // makes the login page full-reload on every update.
  if (url.pathname.startsWith('/_next') && !url.pathname.startsWith('/_next/static')) return

  // Network-first: fresh content when online; cache fallback when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response.redirected &&
          (request.mode === 'navigate' || request.destination === 'document')
        ) {
          return Response.redirect(response.url, 302)
        }
        if (shouldCache(request, response)) {
          const clone = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone))
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
