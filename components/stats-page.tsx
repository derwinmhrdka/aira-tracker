'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GrowthChart } from './growth-chart'
import { GrowthSheet } from './growth-sheet'
import { ActivityTrendsChart } from './activity-trends-chart'
import { Toast } from './toast'
import { ErrorBanner } from './error-banner'
import { playSoundEffect } from '@/lib/sounds'
import { api, isQueuedResponse, type StatsResponse, type CreateGrowthInput } from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'

const PERIOD_OPTIONS = [
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
]

export function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [growthOpen, setGrowthOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await api.getStats(days)
      setStats(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [days])

  useAppDataSync(fetchStats)

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSaveGrowth = async (data: CreateGrowthInput) => {
    const result = await api.createGrowth(data)
    if (isQueuedResponse(result)) {
      setToastMessage('📡 Menunggu sync...')
    } else {
      playSoundEffect('success')
      setToastMessage('📏 Data pertumbuhan tersimpan!')
    }
    setTimeout(() => setToastMessage(null), 2000)
    await fetchStats()
  }

  const period = stats?.period ?? { pup: 0, pee: 0, feed: 0, sleepHours: 0 }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 px-4 pt-6 pb-8"
    >
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Statistik</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ringkasan aktivitas & pertumbuhan bayi
        </p>
      </div>

      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              days === p.days
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <ErrorBanner message="Gagal memuat statistik" onRetry={fetchStats} />
      )}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-4 font-semibold text-foreground">
          Total {days} hari
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { emoji: '💩', value: period.pup, label: 'Pup' },
              { emoji: '💧', value: period.pee, label: 'Pee' },
              { emoji: '🍼', value: period.feed, label: 'Susu' },
              { emoji: '😴', value: `${period.sleepHours}j`, label: 'Tidur' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-secondary p-3 text-center">
                <div className="text-lg">{item.emoji}</div>
                <div className="font-heading mt-1 text-lg font-bold text-foreground">
                  {item.value}
                </div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">
          Daily Trend
        </h2>
        {loading ? (
          <div className="h-56 animate-pulse rounded-lg bg-secondary" />
        ) : (
          <ActivityTrendsChart data={stats?.daily ?? []} />
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">
            Pertumbuhan
          </h2>
          <button
            type="button"
            onClick={() => setGrowthOpen(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Add
          </button>
        </div>
        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-secondary" />
        ) : (
          <GrowthChart data={stats?.growth ?? []} />
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">Insight</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
            <span className="text-lg">🌙</span>
            <div className="text-sm">
              <p className="font-semibold text-foreground">Rata-rata tidur</p>
              <p className="text-muted-foreground">
                {stats?.insights.avgSleepHours
                  ? `~${stats.insights.avgSleepHours} jam per sesi`
                  : 'Belum cukup data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
            <span className="text-lg">📈</span>
            <div className="text-sm">
              <p className="font-semibold text-foreground">Interval menyusui</p>
              <p className="text-muted-foreground">
                {stats?.insights.avgFeedingIntervalHours
                  ? `Setiap ~${stats.insights.avgFeedingIntervalHours} jam`
                  : 'Belum cukup data'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <GrowthSheet
        open={growthOpen}
        onClose={() => setGrowthOpen(false)}
        onSave={handleSaveGrowth}
      />

      {toastMessage && <Toast message={toastMessage} />}
    </motion.div>
  )
}
