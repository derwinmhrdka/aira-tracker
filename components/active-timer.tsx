'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatDuration } from '@/lib/baby-utils'

interface ActiveTimerProps {
  type: 'feeding' | 'sleep'
  startTime: string | null
  active: boolean
}

export function ActiveTimer({ type, startTime, active }: ActiveTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active || !startTime) {
      setElapsed(0)
      return
    }

    const tick = () => {
      setElapsed(Date.now() - new Date(startTime).getTime())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [active, startTime])

  if (!active || !startTime) return null

  const isFeed = type === 'feeding'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 rounded-2xl border p-4 shadow-sm ${
        isFeed
          ? 'border-orange-300/50 bg-orange-50/80 dark:bg-orange-950/30'
          : 'border-purple-300/50 bg-purple-50/80 dark:bg-purple-950/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.span
            animate={isFeed ? { rotate: [0, -10, 10, 0] } : { opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-3xl"
          >
            {isFeed ? '🍼' : '😴'}
          </motion.span>
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">
              {isFeed ? 'Sedang menyusui' : 'Sedang tidur'}
            </p>
            <p className="text-xs text-muted-foreground">Tap button to finish</p>
          </div>
        </div>
        <div className="font-heading text-3xl font-bold tabular-nums text-foreground">
          {formatDuration(elapsed)}
        </div>
      </div>
    </motion.div>
  )
}
