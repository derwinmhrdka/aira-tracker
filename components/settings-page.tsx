'use client'

import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { PageHeader } from './page-header'
import { Toast } from './toast'
import { AppIcon } from './app-icon'
import { useTheme } from '@/lib/theme-context'
import {
  getReminderSettings,
  setReminderSettings,
  requestNotificationPermission,
} from '@/lib/reminder'
import { subscribeToPush, unsubscribeFromPush, updatePushReminderInterval } from '@/lib/push-client'
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound-settings'
import { api } from '@/lib/api-client'
import { exportHistoryCsv, exportGrowthCsv, exportFullCsv } from '@/lib/export-csv'
import { exportHistoryPdf, exportGrowthPdf, exportFullPdf } from '@/lib/export-pdf'
import { downloadBackupJson, readBackupFile } from '@/lib/backup-client'

interface SettingsPageProps {
  onBack: () => void
}

const INTERVALS = [2, 2.5, 3, 4, 5]
const EXPORT_DAYS = [7, 30, 90]

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { theme, toggleTheme } = useTheme()
  const [reminders, setReminders] = useState(getReminderSettings())
  const [soundOn, setSoundOn] = useState(isSoundEnabled())
  const [toast, setToast] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportDays, setExportDays] = useState(30)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [changingPin, setChangingPin] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const toggleReminders = async () => {
    if (!reminders.enabled) {
      const ok = await requestNotificationPermission()
      if (!ok) {
        setToast('❌ Izin notifikasi ditolak')
        setTimeout(() => setToast(null), 3000)
        return
      }
      const subscribed = await subscribeToPush(reminders.feedingIntervalHours)
      if (!subscribed) {
        setToast('⚠️ Push server belum dikonfigurasi — notifikasi lokal saja')
        setTimeout(() => setToast(null), 3000)
      }
    } else {
      await unsubscribeFromPush()
    }
    const next = setReminderSettings({ enabled: !reminders.enabled })
    setReminders(next)
    setToast(next.enabled ? '🔔 Pengingat aktif' : '🔕 Pengingat dimatikan')
    setTimeout(() => setToast(null), 2000)
  }

  const setInterval = (hours: number) => {
    const next = setReminderSettings({ feedingIntervalHours: hours })
    setReminders(next)
    void updatePushReminderInterval(hours)
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundEnabled(next)
    setSoundOn(next)
    setToast(next ? '🔊 Suara aktif' : '🔇 Suara dimatikan')
    setTimeout(() => setToast(null), 2000)
  }

  const handleExport = async (type: 'history' | 'growth' | 'all') => {
    setExporting(true)
    try {
      if (type === 'growth') {
        const growth = await api.getGrowth()
        exportGrowthCsv(growth)
      } else if (type === 'history') {
        const items = await api.getAllHistory(exportDays)
        exportHistoryCsv(items, exportDays)
      } else {
        const [history, growth, milestones, immunizations, development] =
          await Promise.all([
            api.getAllHistory(exportDays),
            api.getGrowth(),
            api.getMilestones(),
            api.getImmunizations(),
            api.getDevelopmentChecklist(),
          ])
        exportFullCsv({
          history,
          growth,
          milestones,
          immunizations,
          development,
          days: exportDays,
        })
      }
      setToast('📥 Export berhasil!')
      setTimeout(() => setToast(null), 2000)
    } finally {
      setExporting(false)
    }
  }

  const handleBackupJson = async () => {
    setBackingUp(true)
    try {
      const data = await api.exportBackup()
      downloadBackupJson(data)
      setToast('💾 Backup JSON tersimpan!')
      setTimeout(() => setToast(null), 2000)
    } finally {
      setBackingUp(false)
    }
  }

  const handleRestoreJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (
      !confirm(
        'Restore akan MENGGANTI semua data log, milestone, dan profil dari file backup. Lanjutkan?'
      )
    ) {
      return
    }

    setRestoring(true)
    try {
      const data = await readBackupFile(file)
      await api.restoreBackup(data as Parameters<typeof api.restoreBackup>[0])
      setToast('✅ Data berhasil dipulihkan! Muat ulang...')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setToast(`❌ ${err instanceof Error ? err.message : 'Restore gagal'}`)
      setTimeout(() => setToast(null), 3000)
    } finally {
      setRestoring(false)
    }
  }

  const handleChangePin = async () => {
    if (!oldPin || !newPin) return
    setChangingPin(true)
    try {
      await api.changePin(oldPin, newPin)
      setOldPin('')
      setNewPin('')
      setToast('🔐 PIN berhasil diubah!')
      setTimeout(() => setToast(null), 2000)
    } catch (err) {
      setToast(`❌ ${err instanceof Error ? err.message : 'Gagal ubah PIN'}`)
      setTimeout(() => setToast(null), 3000)
    } finally {
      setChangingPin(false)
    }
  }

  const handleExportPdf = async (type: 'history' | 'growth' | 'all') => {
    setExporting(true)
    try {
      if (type === 'growth') {
        const growth = await api.getGrowth()
        exportGrowthPdf(growth)
      } else if (type === 'history') {
        const items = await api.getAllHistory(exportDays)
        exportHistoryPdf(items, exportDays)
      } else {
        const [history, growth, milestones, immunizations, development] =
          await Promise.all([
            api.getAllHistory(exportDays),
            api.getGrowth(),
            api.getMilestones(),
            api.getImmunizations(),
            api.getDevelopmentChecklist(),
          ])
        exportFullPdf({ history, growth, milestones, immunizations, development, days: exportDays })
      }
      setToast('📄 PDF berhasil!')
      setTimeout(() => setToast(null), 2000)
    } finally {
      setExporting(false)
    }
  }

  const handleLogout = async () => {
    await api.logout()
    window.location.href = '/login'
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Pengaturan" subtitle="Notifikasi & data" onBack={onBack} />

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">Tampilan</h2>
        <button
          type="button"
          onClick={toggleTheme}
          className="mb-2 flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-foreground"
        >
          <span>Tema</span>
          <span className="flex items-center gap-2">
            {theme === 'light' ? 'Terang' : 'Gelap'}
            <AppIcon icon={theme === 'light' ? Moon : Sun} size={18} strokeWidth={1.75} />
          </span>
        </button>
        <button
          type="button"
          onClick={toggleSound}
          className="flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-foreground"
        >
          <span>Efek suara</span>
          <span>{soundOn ? '🔊 On' : '🔇 Off'}</span>
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">
          Pengingat Menyusui
        </h2>
        <button
          type="button"
          onClick={toggleReminders}
          className={`mb-3 w-full rounded-xl py-3 text-sm font-semibold ${
            reminders.enabled
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground'
          }`}
        >
          {reminders.enabled ? '🔔 On' : '🔕 Off'}
        </button>
        {reminders.enabled && (
          <div className="flex flex-wrap gap-2">
            {INTERVALS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setInterval(h)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  reminders.feedingIntervalHours === h
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                Every {h}h
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">Data</h2>
        <p className="mb-2 text-xs text-muted-foreground">History range</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {EXPORT_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setExportDays(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                exportDays === d
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleExport('history')}
            disabled={exporting}
            className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {exporting ? '...' : '📥 History'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('growth')}
            disabled={exporting}
            className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {exporting ? '...' : '📏 Tumbuh'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('all')}
            disabled={exporting}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {exporting ? '...' : '📦 All CSV'}
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf('history')}
            disabled={exporting}
            className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {exporting ? '...' : '📄 History PDF'}
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf('growth')}
            disabled={exporting}
            className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {exporting ? '...' : '📄 Tumbuh PDF'}
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf('all')}
            disabled={exporting}
            className="w-full rounded-xl bg-primary/80 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {exporting ? '...' : '📄 All PDF'}
          </button>
          <button
            type="button"
            onClick={handleBackupJson}
            disabled={backingUp}
            className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {backingUp ? '...' : '💾 Backup'}
          </button>
          <label className="block">
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleRestoreJson}
              disabled={restoring}
            />
            <span
              className={`flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-foreground ${restoring ? 'opacity-50' : ''}`}
            >
              {restoring ? '...' : '📂 Restore'}
            </span>
          </label>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">Security</h2>
        <div className="space-y-2">
          <input
            type="password"
            inputMode="numeric"
            placeholder="Old PIN"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
            maxLength={6}
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="New PIN (4-6 digit)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
            maxLength={6}
          />
          <button
            type="button"
            onClick={handleChangePin}
            disabled={!oldPin || newPin.length < 4 || changingPin}
            className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {changingPin ? '...' : '🔐 Change PIN'}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full rounded-xl border border-destructive/30 py-3 text-sm font-semibold text-destructive"
      >
        Logout
      </button>

      {toast && <Toast message={toast} />}
    </div>
  )
}
