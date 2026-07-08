'use client'

import { useEffect, useState } from 'react'
import {
  combineIntervalMinutes,
  formatReminderInterval,
  splitIntervalMinutes,
} from '@/lib/reminder'

interface ReminderIntervalPickerProps {
  totalMinutes: number
  onChange: (minutes: number) => void
}

export function ReminderIntervalPicker({
  totalMinutes,
  onChange,
}: ReminderIntervalPickerProps) {
  const [hours, setHours] = useState(() => splitIntervalMinutes(totalMinutes).hours)
  const [minutes, setMinutes] = useState(() => splitIntervalMinutes(totalMinutes).minutes)

  useEffect(() => {
    const split = splitIntervalMinutes(totalMinutes)
    setHours(split.hours)
    setMinutes(split.minutes)
  }, [totalMinutes])

  const applyInterval = (nextHours: number, nextMinutes: number) => {
    const total = combineIntervalMinutes(nextHours, nextMinutes)
    setHours(Math.floor(total / 60))
    setMinutes(total % 60)
    onChange(total)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Setiap <span className="font-medium text-foreground">{formatReminderInterval(totalMinutes)}</span>
      </p>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Jam</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={12}
            value={hours}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (Number.isNaN(next)) return
              setHours(next)
            }}
            onBlur={() => applyInterval(hours, minutes)}
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
            onBlur={() => applyInterval(hours, minutes)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base"
          />
        </label>
      </div>
    </div>
  )
}
