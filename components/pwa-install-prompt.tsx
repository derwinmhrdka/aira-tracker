'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('pwa_install_dismissed')) {
      setDismissed(true)
      return
    }
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua)
    setIsIos(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem('pwa_install_dismissed', '1')
    setDismissed(true)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    dismiss()
  }

  if (dismissed) return null
  if (!deferred && !isIos) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-screen-sm"
      >
        <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📲</span>
            <div className="flex-1">
              <p className="font-heading text-sm font-semibold text-foreground">
                Install App
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isIos
                  ? 'Tap Share → Add to Home Screen untuk akses cepat'
                  : 'Akses lebih cepat seperti app native'}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs text-muted-foreground"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
          {!isIos && deferred && (
            <button
              type="button"
              onClick={install}
              className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Install
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
