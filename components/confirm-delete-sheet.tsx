'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDeleteSheetProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  loading?: boolean
  destructive?: boolean
}

export function ConfirmDeleteSheet({
  open,
  title = 'Delete?',
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
  destructive = true,
}: ConfirmDeleteSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/40"
            onClick={onCancel}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-2xl border-t border-border bg-card p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h2 className="font-heading text-center text-lg font-bold text-foreground">
              {title}
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">{message}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 ${
                  destructive
                    ? 'bg-destructive text-white'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {loading ? '...' : confirmLabel}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
