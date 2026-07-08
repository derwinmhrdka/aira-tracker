'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from './page-header'
import { GrowthSheet } from './growth-sheet'
import { KmsGrowthChart } from './kms-growth-chart'
import { KmsStatusBadge } from './kms-status-badge'
import { ConfirmDeleteSheet } from './confirm-delete-sheet'
import { Toast } from './toast'
import { playSoundEffect } from '@/lib/sounds'
import { api, type GrowthLog, type BabyProfile, type CreateGrowthInput } from '@/lib/api-client'
import { useAppDataSync } from '@/lib/use-app-data-sync'
import type { GrowthMetric } from '@/lib/who-growth'

interface GrowthPageProps {
  onBack: () => void
}

export function GrowthPage({ onBack }: GrowthPageProps) {
  const [growth, setGrowth] = useState<GrowthLog[]>([])
  const [profile, setProfile] = useState<BabyProfile | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<GrowthLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [metric, setMetric] = useState<GrowthMetric>('weight')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<GrowthLog | null>(null)

  const fetchData = useCallback(async () => {
    const [g, p] = await Promise.all([api.getGrowth(), api.getBabyProfile()])
    setGrowth(g)
    setProfile(p)
    setLoading(false)
  }, [])

  useAppDataSync(fetchData)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = async (data: CreateGrowthInput) => {
    await api.createGrowth(data)
    playSoundEffect('success')
    setToast('📏 Data tersimpan!')
    setTimeout(() => setToast(null), 2000)
    setLoading(true)
    await fetchData()
  }

  const handleEdit = async (data: CreateGrowthInput) => {
    if (!editingLog) return
    await api.updateGrowth(editingLog.id, data)
    playSoundEffect('success')
    setToast('✓ Data diperbarui!')
    setTimeout(() => setToast(null), 2000)
    setEditingLog(null)
    setLoading(true)
    await fetchData()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const log = pendingDelete
    setDeletingId(log.id)
    try {
      await api.deleteGrowth(log.id)
      setGrowth((prev) => prev.filter((g) => g.id !== log.id))
      setToast('🗑️ Data dihapus')
      setTimeout(() => setToast(null), 2000)
      setPendingDelete(null)
    } finally {
      setDeletingId(null)
    }
  }

  const birthDate = profile?.birth_date ?? new Date().toISOString().split('T')[0]
  const gender = profile?.gender ?? 'MALE'

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader
        title="Pertumbuhan"
        subtitle="Data bulanan & grafik KMS/WHO"
        onBack={onBack}
      />

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">Grafik KMS</h2>
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
              onClick={() => setSheetOpen(true)}
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
            gender={profile?.gender ?? 'MALE'}
            metric={metric}
          />
        )}
      </div>

      {!loading && growth.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="font-heading mb-3 font-semibold text-foreground">History</h2>
          <div className="space-y-2">
            {[...growth].reverse().map((g) => (
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
        </div>
      )}

      <GrowthSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={handleCreate} />
      <GrowthSheet
        open={!!editingLog}
        onClose={() => setEditingLog(null)}
        onSave={handleEdit}
        initial={editingLog}
        mode="edit"
      />
      {toast && <Toast message={toast} />}
      <ConfirmDeleteSheet
        open={!!pendingDelete}
        title="Hapus data?"
        message="Data pertumbuhan ini akan dihapus permanen."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        loading={!!deletingId}
      />
    </div>
  )
}
