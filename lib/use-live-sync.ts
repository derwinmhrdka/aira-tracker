import { useEffect, useRef } from 'react'

/** Poll interval while app is visible — multi-device sync */
export const LIVE_SYNC_MS = 20000

export function useLiveSync(onSync: () => void, enabled = true) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      if (document.visibilityState === 'visible') {
        onSyncRef.current()
      }
    }

    tick()

    const id = setInterval(tick, LIVE_SYNC_MS)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)

    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [enabled])
}

export function notifyDataSynced() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-data-synced'))
  }
}
