'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { flushQueue, getQueue, queueLength } from '@/lib/offline-queue'

export function OfflineSyncProvider() {
  const [pending, setPending] = useState(0)
  const [offline, setOffline] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setPending(queueLength())
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine)
  }, [])

  const sync = useCallback(async () => {
    if (syncing || queueLength() === 0) return
    setSyncing(true)
    try {
      const { synced } = await flushQueue()
      refresh()
      if (synced > 0) {
        setToast(`✓ ${synced} data tersinkron`)
        setTimeout(() => setToast(null), 2500)
        window.dispatchEvent(new CustomEvent('app-data-synced'))
      }
    } finally {
      setSyncing(false)
    }
  }, [syncing, refresh])

  useEffect(() => {
    refresh()
    const onUpdate = () => refresh()
    const onOnline = () => {
      refresh()
      sync()
    }
    const onOffline = () => refresh()

    window.addEventListener('offline-queue-updated', onUpdate)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const id = setInterval(() => {
      if (navigator.onLine && getQueue().length > 0) sync()
    }, 30000)

    return () => {
      window.removeEventListener('offline-queue-updated', onUpdate)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(id)
    }
  }, [refresh, sync])

  const showBanner = offline || pending > 0

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.button
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          type="button"
          onClick={sync}
          disabled={syncing || offline || pending === 0}
          className="fixed left-4 right-4 top-2 z-50 mx-auto max-w-screen-sm rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-2.5 text-center text-xs font-semibold text-amber-900 shadow-md dark:bg-amber-950/80 dark:text-amber-200"
        >
          {syncing
            ? 'Sync...'
            : offline
              ? pending > 0
                ? `📴 Offline · ${pending} menunggu`
                : '📴 Offline'
              : `📡 ${pending} menunggu — ketuk untuk sync`}
        </motion.button>
      )}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-28 left-4 right-4 z-50 mx-auto max-w-screen-sm rounded-xl bg-card px-4 py-3 text-center text-sm font-medium shadow-lg"
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
