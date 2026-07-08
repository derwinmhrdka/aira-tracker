'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    import('@/lib/reminder').then(({ registerServiceWorker }) => {
      registerServiceWorker()
    })

    if (!('serviceWorker' in navigator)) return

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data.url) {
        window.dispatchEvent(
          new CustomEvent('pwa-navigate', { detail: { url: event.data.url } })
        )
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  return null
}
