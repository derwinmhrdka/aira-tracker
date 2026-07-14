import { useEffect, useRef } from 'react'
import { useLiveSync, type LiveSyncOptions } from '@/lib/use-live-sync'

export type AppDataSyncOptions = LiveSyncOptions

export function useAppDataSync(
  onSync: () => void,
  options: boolean | AppDataSyncOptions = true
) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  const enabled =
    typeof options === 'boolean' ? options : options.enabled !== false

  useLiveSync(() => onSyncRef.current(), options)

  useEffect(() => {
    if (!enabled) return
    const handler = () => onSyncRef.current()
    window.addEventListener('app-data-synced', handler)
    return () => window.removeEventListener('app-data-synced', handler)
  }, [enabled])
}
