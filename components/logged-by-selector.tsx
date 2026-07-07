'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LoggedBy } from '@/lib/types'
import { getLoggedBy, setLoggedBy } from '@/lib/api-client'

const OPTIONS: { value: LoggedBy; icon: string; label: string }[] = [
  { value: 'AYAH', icon: '👨', label: 'Ayah' },
  { value: 'IBU', icon: '👩', label: 'Ibu' },
  { value: 'PENGASUH', icon: '🧑‍🍼', label: 'Pengasuh' },
]

interface LoggedBySelectorProps {
  value?: LoggedBy
  onChange?: (value: LoggedBy) => void
}

export function LoggedBySelector({ value, onChange }: LoggedBySelectorProps) {
  const [current, setCurrent] = useState<LoggedBy>('IBU')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrent(value ?? getLoggedBy() ?? 'IBU')
  }, [value])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (v: LoggedBy) => {
    setCurrent(v)
    setLoggedBy(v)
    onChange?.(v)
    setOpen(false)
  }

  const currentOption = OPTIONS.find((o) => o.value === current) ?? OPTIONS[1]

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full bg-secondary p-2 text-lg leading-none transition-colors hover:bg-secondary/80"
        whileTap={{ scale: 0.95 }}
        aria-label={`Logged by: ${currentOption.label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={currentOption.label}
      >
        {currentOption.icon}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 flex flex-col gap-1 rounded-xl border border-border bg-card p-1.5 shadow-lg"
            role="listbox"
            aria-label="Select logged by"
          >
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={current === opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  current === opt.value
                    ? 'bg-primary/20 font-semibold text-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <span className="text-lg leading-none">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
