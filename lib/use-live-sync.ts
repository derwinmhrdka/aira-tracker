import { useEffect, useRef } from 'react'

/** Default multi-device poll while app is visible */
export const LIVE_SYNC_MS = 60_000

/** Faster poll when a feed/sleep timer is active */
export const LIVE_SYNC_ACTIVE_MS = 30_000

const FOCUS_SYNC_DEBOUNCE_MS = 400

export type LiveSyncOptions = {
  enabled?: boolean
  /** Periodic poll interval; ignored when poll is false */
  intervalMs?: number
  /** When false, only sync on focus / becoming visible (no interval) */
  poll?: boolean
}

function normalizeOptions(
  options: boolean | LiveSyncOptions = true
): Required<Pick<LiveSyncOptions, 'enabled' | 'intervalMs' | 'poll'>> {
  if (typeof options === 'boolean') {
    return { enabled: options, intervalMs: LIVE_SYNC_MS, poll: true }
  }
  return {
    enabled: options.enabled !== false,
    intervalMs: options.intervalMs ?? LIVE_SYNC_MS,
    poll: options.poll !== false,
  }
}

export function useLiveSync(
  onSync: () => void,
  options: boolean | LiveSyncOptions = true
) {
  const { enabled, intervalMs, poll } = normalizeOptions(options)
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  useEffect(() => {
    if (!enabled) return

    let debounceId: ReturnType<typeof setTimeout> | null = null

    const run = () => {
      if (document.visibilityState !== 'visible') return
      onSyncRef.current()
    }

    /** Coalesce focus + visibilitychange when returning to the app */
    const schedule = () => {
      if (debounceId) clearTimeout(debounceId)
      debounceId = setTimeout(run, FOCUS_SYNC_DEBOUNCE_MS)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule()
    }

    let intervalId: ReturnType<typeof setInterval> | null = null
    if (poll && intervalMs > 0) {
      intervalId = setInterval(run, intervalMs)
    }

    window.addEventListener('focus', schedule)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (debounceId) clearTimeout(debounceId)
      window.removeEventListener('focus', schedule)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs, poll])
}

export function notifyDataSynced() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-data-synced'))
  }
}
