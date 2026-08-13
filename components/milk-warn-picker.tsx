'use client'

import { useState, type ReactNode } from 'react'
import {
  clampMilkWarnMinutes,
  formatMilkWarnBefore,
  MILK_WARN_PRESETS,
  MAX_MILK_WARN_MINUTES,
} from '@/lib/milk-storage'

interface MilkWarnPickerProps {
  totalMinutes: number
  onChange: (minutes: number) => void
}

function ScrollChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  )
}

function splitMinutes(total: number) {
  const clamped = clampMilkWarnMinutes(total)
  return { hours: Math.floor(clamped / 60), minutes: clamped % 60 }
}

export function MilkWarnPicker({ totalMinutes, onChange }: MilkWarnPickerProps) {
  const [customOpen, setCustomOpen] = useState(false)
  const { hours, minutes } = splitMinutes(totalMinutes)
  const presetMatch = MILK_WARN_PRESETS.some((p) => p.minutes === totalMinutes)

  const applyTotal = (h: number, m: number) => {
    onChange(clampMilkWarnMinutes(h * 60 + m))
  }

  return (
    <div className="rounded-2xl bg-secondary/50 p-3">
      <ScrollChipRow>
        {MILK_WARN_PRESETS.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            onClick={() => {
              onChange(preset.minutes)
              setCustomOpen(false)
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              totalMinutes === preset.minutes
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground ring-1 ring-border'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
            customOpen || !presetMatch
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-foreground ring-1 ring-border'
          }`}
        >
          {customOpen || !presetMatch
            ? formatMilkWarnBefore(totalMinutes)
            : 'Lainnya'}
        </button>
      </ScrollChipRow>

      {customOpen && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-xl bg-background ring-1 ring-border">
            <button
              type="button"
              onClick={() => applyTotal(Math.max(0, hours - 1), minutes)}
              className="flex h-10 w-10 items-center justify-center text-lg text-muted-foreground"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-sm font-bold tabular-nums">{hours}</span>
              <span className="ml-0.5 text-[10px] text-muted-foreground">jam</span>
            </div>
            <button
              type="button"
              onClick={() =>
                applyTotal(
                  Math.min(Math.floor(MAX_MILK_WARN_MINUTES / 60), hours + 1),
                  minutes
                )
              }
              className="flex h-10 w-10 items-center justify-center text-lg text-muted-foreground"
            >
              +
            </button>
          </div>
          <div className="flex flex-1 items-center rounded-xl bg-background ring-1 ring-border">
            <button
              type="button"
              onClick={() => applyTotal(hours, Math.max(0, minutes - 5))}
              className="flex h-10 w-10 items-center justify-center text-lg text-muted-foreground"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-sm font-bold tabular-nums">{minutes}</span>
              <span className="ml-0.5 text-[10px] text-muted-foreground">mnt</span>
            </div>
            <button
              type="button"
              onClick={() => applyTotal(hours, Math.min(59, minutes + 5))}
              className="flex h-10 w-10 items-center justify-center text-lg text-muted-foreground"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
