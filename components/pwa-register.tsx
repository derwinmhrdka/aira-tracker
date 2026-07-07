'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    import('@/lib/reminder').then(({ registerServiceWorker }) => {
      registerServiceWorker()
    })
  }, [])

  return null
}
