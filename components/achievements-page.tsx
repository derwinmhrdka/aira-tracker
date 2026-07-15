'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from './page-header'
import { Celebration } from './celebration'
import { ErrorBanner } from './error-banner'
import { api, type TitleItem } from '@/lib/api-client'
import { playSoundEffect } from '@/lib/sounds'

interface AchievementsPageProps {
  onBack: () => void
}

const CATEGORY_LABEL: Record<string, string> = {
  physical: 'Fisik',
  cognitive: 'Kognitif',
  linguistic: 'Bahasa',
  social: 'Sosial',
}

const CATEGORY_ORDER = ['social', 'linguistic', 'cognitive', 'physical']

const AGE_LABELS: Record<number, string> = {
  0: 'Baru lahir',
  2: '2 bulan',
  4: '4 bulan',
  6: '6 bulan',
  9: '9 bulan',
  12: '12 bulan',
  15: '15 bulan',
  18: '18 bulan',
  24: '2 tahun',
  30: '2,5 tahun',
  36: '3 tahun',
  48: '4 tahun',
  60: '5 tahun',
}

export function AchievementsPage({ onBack }: AchievementsPageProps) {
  const [titles, setTitles] = useState<TitleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [celebrateName, setCelebrateName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await api.getTitles()
      setTitles(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = async (title: TitleItem) => {
    if (busyId) return
    setBusyId(title.id)
    try {
      const updated = await api.toggleTitle(title.id)
      setTitles((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      )
      if (updated.is_unlocked) {
        playSoundEffect('success')
        setCelebrateName(updated.name)
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 2500)
      } else {
        playSoundEffect('click')
      }
    } finally {
      setBusyId(null)
    }
  }

  const byAge = titles.reduce<Record<number, TitleItem[]>>((acc, t) => {
    const age = t.age_group_months
    if (!acc[age]) acc[age] = []
    acc[age].push(t)
    return acc
  }, {})

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader
        title="Pencapaian"
        subtitle="Badge per usia dari checklist Perkembangan"
        onBack={onBack}
      />

      {error ? (
        <ErrorBanner message="Gagal memuat title" onRetry={load} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : titles.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Belum ada title. Jalankan seed database.
        </p>
      ) : (
        Object.entries(byAge)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([ageStr, ageTitles]) => {
            const age = Number(ageStr)
            const sorted = CATEGORY_ORDER.map((cat) =>
              ageTitles.find((t) => t.category === cat)
            ).filter(Boolean) as TitleItem[]

            return (
              <div key={age} className="mb-6">
                <h2 className="font-heading mb-2 text-sm font-semibold text-primary">
                  {AGE_LABELS[age] ?? `${age} bulan`}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {sorted.map((title) => {
                    const unlocked = title.is_unlocked
                    const checked = title.progress_checked ?? 0
                    const need = title.unlock_at ?? title.progress_total ?? 1
                    const pct =
                      need > 0
                        ? Math.min(100, Math.round((checked / need) * 100))
                        : 0
                    return (
                      <motion.button
                        key={title.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        disabled={busyId === title.id}
                        onClick={() => handleToggle(title)}
                        className={`rounded-2xl border p-3.5 text-left shadow-sm transition-all ${
                          unlocked
                            ? 'border-sky-200/80 bg-sky-50 dark:border-sky-800/60 dark:bg-sky-950/40'
                            : 'border-border bg-secondary/40 opacity-55 grayscale'
                        }`}
                      >
                        <div
                          className={`mb-1.5 text-3xl ${unlocked ? '' : 'opacity-70'}`}
                        >
                          {title.emoji}
                        </div>
                        <p className="font-heading text-[13px] font-semibold leading-snug text-foreground">
                          {title.name}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_LABEL[title.category] ?? title.category}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          {title.description}
                        </p>

                        <div className="mt-2">
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-muted-foreground">
                              Checklist
                            </span>
                            <span className="text-[10px] font-medium text-foreground">
                              {checked}/{need}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${
                                unlocked ? 'bg-sky-500' : 'bg-primary/70'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <p
                          className={`mt-1.5 text-[10px] font-semibold ${
                            unlocked
                              ? 'text-sky-600 dark:text-sky-300'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {unlocked
                            ? 'Unlocked ✓'
                            : need > 0 && checked >= need
                              ? 'Siap dibuka'
                              : 'Tap untuk unlock'}
                        </p>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )
          })
      )}

      {celebrate && (
        <Celebration message={`${celebrateName} unlocked! 🎊`} />
      )}
    </div>
  )
}
