'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getLeapStatus } from '@/lib/baby-leaps'

interface BabyLeapCardProps {
  birthDate?: string | null
  dueDate?: string | null
}

function LeapDetail({
  hint,
  signs,
  tips,
}: {
  hint: string
  signs: string[]
  tips: string[]
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs leading-relaxed text-foreground/80">{hint}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <section className="rounded-2xl bg-muted/70 px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-foreground/70 uppercase">Signs</p>
          <ul className="list-disc space-y-0.5 pl-3.5 marker:text-foreground/45">
            {signs.map((item) => (
              <li key={item} className="text-xs leading-snug text-foreground">
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-primary/10 px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-primary/80 uppercase">Tips</p>
          <ul className="list-disc space-y-0.5 pl-3.5 marker:text-primary">
            {tips.map((item) => (
              <li key={item} className="text-xs leading-snug text-foreground">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export function BabyLeapCard({ birthDate, dueDate }: BabyLeapCardProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [bottom, setBottom] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const status = useMemo(() => getLeapStatus(birthDate, dueDate), [birthDate, dueDate])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setBottom(window.innerHeight - rect.top + 10)
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  if (!status || status.phase === 'done') return null

  const leap = status.leap
  const isActive = status.phase === 'active'
  const timing = isActive
    ? `In progress · ~${status.daysLeftInLeap} days left`
    : status.daysUntilStart === 0
      ? 'Starting around today'
      : `Starts in ~${status.daysUntilStart} days`

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur-sm"
        aria-expanded={open}
      >
        <span aria-hidden>{leap.emoji}</span>
        <span>Leap {leap.number}</span>
      </button>
      {open && mounted
        ? createPortal(
            <div
              className="fixed z-50 overflow-hidden rounded-3xl border border-border bg-card px-4 py-3.5 text-left shadow-xl"
              style={{ left: '1rem', right: '1rem', bottom }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-sm font-semibold text-foreground">
                    <span aria-hidden className="mr-1.5">{leap.emoji}</span>
                    Leap {leap.number}
                  </p>
                  <p className="text-xs text-muted-foreground">{leap.title}</p>
                </div>
                <p className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {timing}
                </p>
              </div>
              <LeapDetail hint={leap.hint} signs={leap.signs} tips={leap.tips} />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
