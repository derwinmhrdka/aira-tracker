'use client'

import { useEffect, useState } from 'react'
import {
  clampMilkWarnMinutes,
  formatMilkWarnBefore,
  MILK_WARN_PRESETS,
  MAX_MILK_WARN_MINUTES,
  MIN_MILK_WARN_MINUTES,
} from '@/lib/milk-storage'

interface MilkWarnPickerProps {
  totalMinutes: number
  onChange: (minutes: number) => void
}

function splitMinutes(total: number) {
  const clamped = clampMilkWarnMinutes(total)
  return {
    hours: Math.floor(clamped / 60),
    minutes: clamped % 60,
  }
}

export function MilkWarnPicker({ totalMinutes, onChange }: MilkWarnPickerProps) {
  const [hours, setHours] = useState(() => splitMinutes(totalMinutes).hours)
  const [minutes, setMinutes] = useState(() => splitMinutes(totalMinutes).minutes)

  useEffect(() => {
    const split = splitMinutes(totalMinutes)
    setHours(split.hours)
    setMinutes(split.minutes)
  }, [totalMinutes])

  const applyCustom = (nextHours: number, nextMinutes: number) => {
    const total = clampMilkWarnMinutes(nextHours * 60 + nextMinutes)
    setHours(Math.floor(total / 60))
    setMinutes(total % 60)
    onChange(total)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Ingatkan{' '}
        <span className="font-medium text-foreground">
          {formatMilkWarnBefore(totalMinutes)}
        </span>{' '}
        sebelum expired
      </p>

      <div className="flex flex-wrap gap-1.5">
        {MILK_WARN_PRESETS.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            onClick={() => onChange(preset.minutes)}
            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
              totalMinutes === preset.minutes
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Jam</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={Math.floor(MAX_MILK_WARN_MINUTES / 60)}
            value={hours}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (Number.isNaN(next)) return
              setHours(next)
            }}
            onBlur={() => applyCustom(hours, minutes)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Menit</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={5}
            value={minutes}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (Number.isNaN(next)) return
              setMinutes(next)
            }}
            onBlur={() => applyCustom(hours, minutes)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base"
          />
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Min {formatMilkWarnBefore(MIN_MILK_WARN_MINUTES)} · max{' '}
        {formatMilkWarnBefore(MAX_MILK_WARN_MINUTES)}
      </p>
    </div>
  )
}
