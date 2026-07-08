import { useEffect, useRef } from 'react'
import { useLiveSync } from '@/lib/use-live-sync'

export function useAppDataSync(onSync: () => void, enabled = true) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  useLiveSync(() => onSyncRef.current(), enabled)

  useEffect(() => {
    if (!enabled) return
    const handler = () => onSyncRef.current()
    window.addEventListener('app-data-synced', handler)
    return () => window.removeEventListener('app-data-synced', handler)
  }, [enabled])
}
