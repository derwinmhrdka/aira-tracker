'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { GrowthSheet } from './growth-sheet'
import { KmsGrowthChart } from './kms-growth-chart'
import { KmsStatusBadge } from './kms-status-badge'
import { ActivityTrendsChart } from './activity-trends-chart'
import { ConfirmDeleteSheet } from './confirm-delete-sheet'
import { Toast } from './toast'
import { ErrorBanner } from './error-banner'
import { playSoundEffect } from '@/lib/sounds'
import {
  api,
  isQueuedResponse,
  type StatsResponse,
  type CreateGrowthInput,
  type BabyProfile,
  type GrowthLog,
} from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import type { GrowthMetric } from '@/lib/who-growth'

const PERIOD_OPTIONS = [
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
]

const HISTORY_PAGE_SIZE = 5

export function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [profile, setProfile] = useState<BabyProfile | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [growthOpen, setGrowthOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<GrowthLog | null>(null)
  const [metric, setMetric] = useState<GrowthMetric>('weight')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<GrowthLog | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE)

  const fetchStats = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true)
      setError(false)
    }
    try {
      const [data, babyProfile] = await Promise.all([
        api.getStats(days),
        api.getBabyProfile(),
      ])
      setStats(data)
      setProfile(babyProfile)
    } catch {
      if (!opts?.silent) setError(true)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [days])

  useAppDataSync(() => fetchStats({ silent: true }))

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSaveGrowth = async (data: CreateGrowthInput) => {
    try {
      const result = await api.createGrowth(data)
      if (isQueuedResponse(result)) {
        setToastMessage('📡 Menunggu sync...')
      } else {
        playSoundEffect('success')
        setToastMessage('📏 Data pertumbuhan tersimpan!')
      }
      setTimeout(() => setToastMessage(null), 2000)
      await fetchStats()
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : 'Gagal menyimpan data pertumbuhan'
      )
      setTimeout(() => setToastMessage(null), 3000)
      throw err
    }
  }

  const handleEditGrowth = async (data: CreateGrowthInput) => {
    if (!editingLog) return
    try {
      await api.updateGrowth(editingLog.id, data)
      playSoundEffect('success')
      setToastMessage('✓ Data diperbarui!')
      setTimeout(() => setToastMessage(null), 2000)
      setEditingLog(null)
      await fetchStats()
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : 'Gagal memperbarui data pertumbuhan'
      )
      setTimeout(() => setToastMessage(null), 3000)
      throw err
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const log = pendingDelete
    setDeletingId(log.id)
    try {
      await api.deleteGrowth(log.id)
      setToastMessage('🗑️ Data dihapus')
      setTimeout(() => setToastMessage(null), 2000)
      setPendingDelete(null)
      await fetchStats()
    } finally {
      setDeletingId(null)
    }
  }

  const period = stats?.period ?? { pup: 0, pee: 0, feed: 0, sleepHours: 0 }
  const growth = stats?.growth ?? []
  const growthHistory = useMemo(
    () => [...growth].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [growth]
  )
  const visibleGrowthHistory = growthHistory.slice(0, historyLimit)
  const hasMoreHistory = historyLimit < growthHistory.length
  const birthDate = profile?.birth_date ?? new Date().toISOString().split('T')[0]
  const gender = profile?.gender ?? 'MALE'

  const feedSideLabel = useMemo(() => {
    const left = stats?.insights.feedSideLeft ?? 0
    const right = stats?.insights.feedSideRight ?? 0
    if (left === 0 && right === 0) return null
    const total = left + right
    const leftPct = Math.round((left / total) * 100)
    const rightPct = 100 - leftPct
    return `Kiri : Kanan = ${left} : ${right} (${leftPct}% : ${rightPct}%)`
  }, [stats?.insights.feedSideLeft, stats?.insights.feedSideRight])

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
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-semibold text-foreground">Grafik KMS</h2>
            <p className="text-[10px] text-muted-foreground">
              Kurva pertumbuhan WHO
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-secondary p-0.5">
              {(['weight', 'height'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    metric === m
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {m === 'weight' ? 'Berat' : 'Panjang'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setGrowthOpen(true)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Add
            </button>
          </div>
        </div>
        {loading ? (
          <div className="h-[300px] animate-pulse rounded-lg bg-secondary" />
        ) : (
          <KmsGrowthChart
            growthLogs={growth}
            birthDate={birthDate}
            gender={gender}
            metric={metric}
          />
        )}
      </div>

      {!loading && growth.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="font-heading mb-3 font-semibold text-foreground">History</h2>
          <div className="space-y-2">
            {visibleGrowthHistory.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground">
                    {new Date(g.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="font-semibold text-foreground">
                    {g.weight_kg} kg · {g.height_cm} cm
                    {g.is_jaundice && ' · 🟡'}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <KmsStatusBadge
                      value={g.weight_kg}
                      birthDate={birthDate}
                      measureDate={g.date}
                      metric="weight"
                      gender={gender}
                      prefix="Berat"
                    />
                    <KmsStatusBadge
                      value={g.height_cm}
                      birthDate={birthDate}
                      measureDate={g.date}
                      metric="height"
                      gender={gender}
                      prefix="Panjang"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingLog(g)}
                  className="shrink-0 rounded-lg px-2 py-2 opacity-60 hover:opacity-100"
                  aria-label="Edit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(g)}
                  disabled={deletingId === g.id}
                  className="shrink-0 rounded-lg px-2 py-2 text-destructive opacity-60 hover:opacity-100"
                  aria-label="Delete"
                >
                  {deletingId === g.id ? '...' : '🗑️'}
                </button>
              </div>
            ))}
          </div>
          {hasMoreHistory && (
            <button
              type="button"
              onClick={() => setHistoryLimit((prev) => prev + HISTORY_PAGE_SIZE)}
              className="mt-3 w-full rounded-lg border border-border bg-secondary py-2.5 text-xs font-semibold text-foreground"
            >
              Muat lebih banyak ({growthHistory.length - historyLimit} lagi)
            </button>
          )}
        </div>
      )}

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
            <span className="text-lg">🍼</span>
            <div className="text-sm">
              <p className="font-semibold text-foreground">Durasi menyusui</p>
              <p className="text-muted-foreground">
                {stats?.insights.avgFeedingDurationMinutes
                  ? `~${stats.insights.avgFeedingDurationMinutes} menit per sesi`
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
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
            <span className="text-lg">↔️</span>
            <div className="text-sm">
              <p className="font-semibold text-foreground">Sisi menyusui</p>
              <p className="text-muted-foreground">
                {feedSideLabel ?? 'Belum cukup data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
            <span className="text-lg">💩</span>
            <div className="text-sm">
              <p className="font-semibold text-foreground">Rata-rata pup</p>
              <p className="text-muted-foreground">
                ~{stats?.insights.avgPupPerDay ?? 0}x per hari
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
            <span className="text-lg">💧</span>
            <div className="text-sm">
              <p className="font-semibold text-foreground">Rata-rata pee</p>
              <p className="text-muted-foreground">
                ~{stats?.insights.avgPeePerDay ?? 0}x per hari
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
      <GrowthSheet
        open={!!editingLog}
        onClose={() => setEditingLog(null)}
        onSave={handleEditGrowth}
        initial={editingLog}
        mode="edit"
      />
      <ConfirmDeleteSheet
        open={!!pendingDelete}
        title="Hapus data?"
        message="Data pertumbuhan ini akan dihapus permanen."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        loading={!!deletingId}
      />

      {toastMessage && <Toast message={toastMessage} />}
    </motion.div>
  )
}
