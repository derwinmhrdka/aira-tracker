'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getLeapStatus } from '@/lib/baby-leaps'

interface BabyLeapCardProps {
  birthDate?: string | null
}

export function BabyLeapCard({ birthDate }: BabyLeapCardProps) {
  const [open, setOpen] = useState(false)
  const status = useMemo(() => getLeapStatus(birthDate), [birthDate])

  if (!status || status.phase === 'done') return null

  const leap = status.leap
  const isActive = status.phase === 'active'

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 overflow-hidden rounded-2xl border shadow-sm ${
        isActive
          ? 'border-violet-200/80 bg-violet-50/80 dark:border-violet-800/50 dark:bg-violet-950/30'
          : 'border-border bg-card'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left active:opacity-90"
        aria-expanded={open}
      >
        <span className="text-2xl leading-none">{leap.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold text-foreground">
            Leap {leap.number} · {leap.title}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {isActive
              ? `Sedang berlangsung · sisa ~${status.daysLeftInLeap} hari`
              : status.daysUntilStart === 0
                ? 'Mulai sekitar hari ini'
                : `Mulai ~${status.daysUntilStart} hari lagi`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isActive
              ? 'bg-violet-200/80 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          {isActive ? 'Aktif' : 'Sebentar'}
        </span>
        <span className="text-[10px] text-muted-foreground">{open ? '▴' : '▾'}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="space-y-2.5 px-3 py-2.5">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {leap.hint}
              </p>

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                  Tanda-tanda
                </p>
                <ul className="space-y-0.5">
                  {leap.signs.map((s) => (
                    <li
                      key={s}
                      className="text-[10px] leading-snug text-muted-foreground"
                    >
                      · {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                  Tips
                </p>
                <ul className="space-y-0.5">
                  {leap.tips.map((t) => (
                    <li
                      key={t}
                      className="text-[10px] leading-snug text-muted-foreground"
                    >
                      · {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
