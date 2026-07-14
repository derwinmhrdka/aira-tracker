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
  physical: 'Physical',
  cognitive: 'Cognitive',
  linguistic: 'Linguistic',
  social: 'Social',
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

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader
        title="Pencapaian"
        subtitle="Ketuk untuk unlock title bayi"
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
        <div className="grid grid-cols-2 gap-3">
          {titles.map((title) => {
            const unlocked = title.is_unlocked
            return (
              <motion.button
                key={title.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={busyId === title.id}
                onClick={() => handleToggle(title)}
                className={`rounded-2xl border p-4 text-left shadow-sm transition-all ${
                  unlocked
                    ? 'border-sky-200/80 bg-sky-50 dark:border-sky-800/60 dark:bg-sky-950/40'
                    : 'border-border bg-secondary/40 opacity-55 grayscale'
                }`}
              >
                <div
                  className={`mb-2 text-4xl ${unlocked ? '' : 'opacity-70'}`}
                >
                  {title.emoji}
                </div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  {title.name}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABEL[title.category] ?? title.category}
                </p>
                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                  {title.description}
                </p>
                <p
                  className={`mt-2 text-[10px] font-semibold ${
                    unlocked ? 'text-sky-600 dark:text-sky-300' : 'text-muted-foreground'
                  }`}
                >
                  {unlocked ? 'Unlocked ✓' : 'Tap untuk unlock'}
                </p>
              </motion.button>
            )
          })}
        </div>
      )}

      {celebrate && (
        <Celebration message={`${celebrateName} unlocked! 🎊`} />
      )}
    </div>
  )
}
