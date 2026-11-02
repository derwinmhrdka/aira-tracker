'use client'

import { useMemo, useState } from 'react'
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
      <p className="text-[10px] leading-relaxed text-muted-foreground">{hint}</p>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
          Signs
        </p>
        <ul className="space-y-0.5">
          {signs.map((item) => (
            <li key={item} className="text-[10px] leading-snug text-muted-foreground">
              · {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
          Tips
        </p>
        <ul className="space-y-0.5">
          {tips.map((item) => (
            <li key={item} className="text-[10px] leading-snug text-muted-foreground">
              · {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function BabyLeapCard({ birthDate, dueDate }: BabyLeapCardProps) {
  const [open, setOpen] = useState(false)
  const status = useMemo(
    () => getLeapStatus(birthDate, dueDate),
    [birthDate, dueDate]
  )

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
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur-md"
        aria-expanded={open}
      >
        <span aria-hidden>{leap.emoji}</span>
        <span>Leap {leap.number}</span>
      </button>
      {open ? (
        <div
          className="absolute bottom-[calc(100%+0.45rem)] left-0 z-30 max-h-52 w-64 overflow-y-auto rounded-2xl border border-border bg-card p-3 text-left shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="font-heading text-sm font-semibold text-foreground">
            Leap {leap.number} · {leap.title}
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">{timing}</p>
          <LeapDetail hint={leap.hint} signs={leap.signs} tips={leap.tips} />
        </div>
      ) : null}
    </div>
  )
}
