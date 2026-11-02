'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    import('@/lib/reminder').then(({ registerServiceWorker }) => {
      registerServiceWorker()
    })

    if (!('serviceWorker' in navigator)) return

    let hadController = Boolean(navigator.serviceWorker.controller)
    const onControllerChange = () => {
      if (!hadController) {
        hadController = true
        return
      }
      window.location.reload()
    }
    const checkForUpdate = () => {
      void navigator.serviceWorker.getRegistration().then((registration) => registration?.update())
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', onVisible)
    checkForUpdate()

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data.url) {
        window.dispatchEvent(
          new CustomEvent('pwa-navigate', { detail: { url: event.data.url } })
        )
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
