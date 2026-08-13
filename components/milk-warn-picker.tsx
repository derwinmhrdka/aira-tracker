'use client'

import {
  clampMilkWarnMinutes,
  MILK_WARN_PRESETS,
  MAX_MILK_WARN_MINUTES,
} from '@/lib/milk-storage'
import { Chip, ScrollChipRow, splitTotalMinutes, StepperField } from './duration-picker'

interface MilkWarnPickerProps {
  totalMinutes: number
  onChange: (minutes: number) => void
}

export function MilkWarnPicker({ totalMinutes, onChange }: MilkWarnPickerProps) {
  const { hours, minutes } = splitTotalMinutes(totalMinutes)
  const maxHours = Math.floor(MAX_MILK_WARN_MINUTES / 60)

  const applyTotal = (h: number, m: number) => {
    onChange(clampMilkWarnMinutes(h * 60 + m))
  }

  return (
    <div className="space-y-2 rounded-2xl bg-secondary/50 p-3">
      <ScrollChipRow>
        {MILK_WARN_PRESETS.map((preset) => (
          <Chip
            key={preset.minutes}
            active={totalMinutes === preset.minutes}
            onClick={() => onChange(preset.minutes)}
          >
            {preset.label}
          </Chip>
        ))}
      </ScrollChipRow>
      <div className="flex gap-2">
        <StepperField
          label="jam"
          value={hours}
          min={0}
          max={maxHours}
          onChange={(h) => applyTotal(h, minutes)}
        />
        <StepperField
          label="menit"
          value={minutes}
          min={0}
          max={59}
          step={5}
          onChange={(m) => applyTotal(hours, m)}
        />
      </div>
    </div>
  )
}
