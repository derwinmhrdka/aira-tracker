'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export function ScrollChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-background text-foreground ring-1 ring-border'
      }`}
    >
      {children}
    </button>
  )
}

function clampStepperValue(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function StepperField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hideLabel,
  suffix,
  inputClassName,
  outerClassName,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (next: number) => void
  hideLabel?: boolean
  suffix?: string
  inputClassName?: string
  outerClassName?: string
}) {
  const [draft, setDraft] = useState(String(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value))
  }, [value])

  const commitDraft = (raw: string) => {
    const n = parseInt(raw, 10)
    const next = clampStepperValue(Number.isFinite(n) ? n : value, min, max)
    onChange(next)
    setDraft(String(next))
  }

  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 ${outerClassName ?? ''}`}>
      {!hideLabel && label ? (
        <span className="text-[9px] font-medium leading-none text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="flex w-full items-center rounded-xl bg-background ring-1 ring-border">
        <button
          type="button"
          onClick={() => onChange(clampStepperValue(value - step, min, max))}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-lg text-muted-foreground"
          aria-label={`Kurangi ${label}`}
        >
          −
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 px-0.5">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onFocus={() => {
              focusedRef.current = true
            }}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '')
              setDraft(raw)
              const n = parseInt(raw, 10)
              if (raw !== '' && Number.isFinite(n)) {
                onChange(clampStepperValue(n, min, max))
              }
            }}
            onBlur={() => {
              focusedRef.current = false
              commitDraft(draft)
            }}
            className={
              inputClassName ??
              'w-full min-w-[1.5rem] max-w-[3rem] bg-transparent text-center text-sm font-bold tabular-nums text-foreground outline-none'
            }
            aria-label={label}
          />
          {suffix ? (
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onChange(clampStepperValue(value + step, min, max))}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-lg text-muted-foreground"
          aria-label={`Tambah ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function splitTotalMinutes(total: number) {
  const safe = Math.max(0, Math.round(total))
  return { hours: Math.floor(safe / 60), minutes: safe % 60 }
}
