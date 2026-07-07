'use client'

import { motion } from 'framer-motion'

interface ToastProps {
  message: string
}

export function Toast({ message }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-primary px-6 py-3 text-center font-semibold text-primary-foreground shadow-lg"
    >
      {message}
    </motion.div>
  )
}
