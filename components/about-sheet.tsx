'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'
import { AppIcon } from './app-icon'

interface AboutSheetProps {
  open: boolean
  onClose: () => void
}

export function AboutSheet({ open, onClose }: AboutSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-card p-6 pb-10 text-center shadow-2xl"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/50">
              <AppIcon icon={Heart} size={28} className="fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400" />
            </div>
            <p className="font-heading text-lg font-semibold text-foreground">
              Developed with love
            </p>
            <p className="mt-2 text-sm text-muted-foreground">By Mahardika Family</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
