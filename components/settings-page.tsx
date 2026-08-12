'use client'

import { useState, useEffect } from 'react'
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
import { subscribeToPush, unsubscribeFromPush, updatePushReminderSettings } from '@/lib/push-client'
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound-settings'
import {
  getLocalHomeVisibility,
  setLocalHomeVisibility,
  HOME_VISIBILITY_DEFAULTS,
  HOME_VISIBILITY_OPTIONS,
  type HomeVisibility,
  type HomeVisibilityKey,
} from '@/lib/home-visibility'
import {
  MILK_STORAGE_LAYOUT_DEFAULTS,
  MILK_STORAGE_ROWS_OPTIONS,
  MILK_STORAGE_COLS_OPTIONS,
  getMilkReminderSettings,
  setMilkReminderSettings,
  type MilkStorageLayout,
} from '@/lib/milk-storage'
import { syncMilkReminderSettingsToServer } from '@/lib/milk-expiry-reminder'
import { MilkWarnPicker } from './milk-warn-picker'
import { api } from '@/lib/api-client'
import { exportHistoryCsv, exportGrowthCsv, exportFullCsv } from '@/lib/export-csv'
import { exportHistoryPdf, exportGrowthPdf, exportFullPdf } from '@/lib/export-pdf'
import { downloadBackupJson, readBackupFile } from '@/lib/backup-client'
import { ReminderIntervalPicker } from './reminder-interval-picker'

interface SettingsPageProps {
  onBack: () => void
}

const EXPORT_DAYS = [7, 30, 90]

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { theme, toggleTheme } = useTheme()
  const [reminders, setReminders] = useState(getReminderSettings())
  const [soundOn, setSoundOn] = useState(isSoundEnabled())
  const [homeLocal, setHomeLocal] = useState<HomeVisibility>(getLocalHomeVisibility)
  const [homeGlobal, setHomeGlobal] = useState<HomeVisibility>(HOME_VISIBILITY_DEFAULTS)
  const [homeGlobalLoading, setHomeGlobalLoading] = useState(true)
  const [homeGlobalSaving, setHomeGlobalSaving] = useState(false)
  const [milkLayout, setMilkLayout] = useState<MilkStorageLayout>(
    MILK_STORAGE_LAYOUT_DEFAULTS
  )
  const [milkLayoutSaving, setMilkLayoutSaving] = useState(false)
  const [milkReminder, setMilkReminder] = useState(getMilkReminderSettings)
  const [toast, setToast] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportDays, setExportDays] = useState(30)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [changingPin, setChangingPin] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHomeGlobalLoading(true)
    api
      .getHomeVisibilityGlobal()
      .then((vis) => {
        if (!cancelled) setHomeGlobal(vis)
      })
      .catch(() => {
        if (!cancelled) setHomeGlobal({ ...HOME_VISIBILITY_DEFAULTS })
      })
      .finally(() => {
        if (!cancelled) setHomeGlobalLoading(false)
      })

    api
      .getMilkStorage()
      .then((data) => {
        if (!cancelled) {
          setMilkLayout(data.layout)
          if (data.reminder) {
            const synced = setMilkReminderSettings({
              enabled: data.reminder.enabled,
              warnBeforeMinutes: data.reminder.warn_before_minutes,
            })
            setMilkReminder(synced)
          }
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const pushOptions = () => ({
    feedingIntervalMinutes: reminders.feedingIntervalMinutes,
    feedingReminderEnabled: reminders.feedingEnabled,
    diaperIntervalMinutes: reminders.diaperIntervalMinutes,
    diaperReminderEnabled: reminders.diaperEnabled,
  })

  const toggleFeedingReminders = async () => {
    if (!reminders.feedingEnabled) {
      const ok = await requestNotificationPermission()
      if (!ok) {
        setToast('❌ Izin notifikasi ditolak')
        setTimeout(() => setToast(null), 3000)
        return
      }
      const subscribed = await subscribeToPush({
        ...pushOptions(),
        feedingReminderEnabled: true,
      })
      if (!subscribed) {
        setToast('⚠️ Push server belum dikonfigurasi — notifikasi lokal saja')
        setTimeout(() => setToast(null), 3000)
      }
    } else {
      await updatePushReminderSettings({
        ...pushOptions(),
        feedingReminderEnabled: false,
      })
      if (!reminders.diaperEnabled) {
        await unsubscribeFromPush()
      }
    }
    const next = setReminderSettings({ feedingEnabled: !reminders.feedingEnabled })
    setReminders(next)
    setToast(next.feedingEnabled ? '🔔 Pengingat menyusui aktif' : '🔕 Pengingat menyusui dimatikan')
    setTimeout(() => setToast(null), 2000)
  }

  const toggleDiaperReminders = async () => {
    if (!reminders.diaperEnabled) {
      const ok = await requestNotificationPermission()
      if (!ok) {
        setToast('❌ Izin notifikasi ditolak')
        setTimeout(() => setToast(null), 3000)
        return
      }
      const subscribed = await subscribeToPush({
        ...pushOptions(),
        diaperReminderEnabled: true,
      })
      if (!subscribed) {
        setToast('⚠️ Push server belum dikonfigurasi — notifikasi lokal saja')
        setTimeout(() => setToast(null), 3000)
      }
    } else {
      await updatePushReminderSettings({
        ...pushOptions(),
        diaperReminderEnabled: false,
      })
      if (!reminders.feedingEnabled) {
        await unsubscribeFromPush()
      }
    }
    const next = setReminderSettings({ diaperEnabled: !reminders.diaperEnabled })
    setReminders(next)
    setToast(next.diaperEnabled ? '🔔 Pengingat popok aktif' : '🔕 Pengingat popok dimatikan')
    setTimeout(() => setToast(null), 2000)
  }

  const setFeedingInterval = (minutes: number) => {
    const next = setReminderSettings({ feedingIntervalMinutes: minutes })
    setReminders(next)
    void updatePushReminderSettings({ ...pushOptions(), feedingIntervalMinutes: minutes })
  }

  const setDiaperInterval = (minutes: number) => {
    const next = setReminderSettings({ diaperIntervalMinutes: minutes })
    setReminders(next)
    void updatePushReminderSettings({ ...pushOptions(), diaperIntervalMinutes: minutes })
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundEnabled(next)
    setSoundOn(next)
    setToast(next ? '🔊 Suara aktif' : '🔇 Suara dimatikan')
    setTimeout(() => setToast(null), 2000)
  }

  const toggleHomeLocal = (key: HomeVisibilityKey) => {
    const next = setLocalHomeVisibility({ [key]: !homeLocal[key] })
    setHomeLocal(next)
    const opt = HOME_VISIBILITY_OPTIONS.find((o) => o.key === key)
    setToast(
      next[key]
        ? `📱 ${opt?.label ?? key} tampil di perangkat ini`
        : `📱 ${opt?.label ?? key} disembunyikan di perangkat ini`
    )
    setTimeout(() => setToast(null), 2000)
  }

  const toggleHomeGlobal = async (key: HomeVisibilityKey) => {
    if (homeGlobalSaving) return
    setHomeGlobalSaving(true)
    try {
      const next = await api.updateHomeVisibilityGlobal({
        [key]: !homeGlobal[key],
      })
      setHomeGlobal(next)
      const opt = HOME_VISIBILITY_OPTIONS.find((o) => o.key === key)
      setToast(
        next[key]
          ? `🌐 ${opt?.label ?? key} tampil untuk semua`
          : `🌐 ${opt?.label ?? key} disembunyikan untuk semua`
      )
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast('❌ Gagal menyimpan pengaturan global')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setHomeGlobalSaving(false)
    }
  }

  const saveMilkLayout = async (patch: Partial<MilkStorageLayout>) => {
    if (milkLayoutSaving) return
    const next = {
      rows: patch.rows ?? milkLayout.rows,
      cols: patch.cols ?? milkLayout.cols,
    }
    setMilkLayoutSaving(true)
    setMilkLayout(next)
    try {
      const res = await api.updateMilkStorageLayout(next)
      setMilkLayout(res.layout)
      setToast(
        `🍼 Milk Storage: ${res.layout.rows} baris × ${res.layout.cols} botol`
      )
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast('❌ Gagal simpan layout botol')
      setTimeout(() => setToast(null), 3000)
      try {
        const data = await api.getMilkStorage()
        setMilkLayout(data.layout)
      } catch {
        /* ignore */
      }
    } finally {
      setMilkLayoutSaving(false)
    }
  }

  const toggleMilkReminder = async () => {
    if (!milkReminder.enabled) {
      const ok = await requestNotificationPermission()
      if (!ok) {
        setToast('❌ Izin notifikasi ditolak')
        setTimeout(() => setToast(null), 3000)
        return
      }
      const subscribed = await subscribeToPush(pushOptions())
      if (!subscribed) {
        setToast('⚠️ Push belum aktif — notifikasi lokal saat app terbuka')
        setTimeout(() => setToast(null), 3000)
      }
    }
    const next = setMilkReminderSettings({ enabled: !milkReminder.enabled })
    setMilkReminder(next)
    try {
      await syncMilkReminderSettingsToServer(next)
    } catch {
      setToast('⚠️ Gagal sync pengaturan ke server')
      setTimeout(() => setToast(null), 3000)
      return
    }
    setToast(
      next.enabled
        ? '🔔 Pengingat botol ASI aktif'
        : '🔕 Pengingat botol ASI dimatikan'
    )
    setTimeout(() => setToast(null), 2000)
  }

  const setMilkWarnBefore = async (minutes: number) => {
    const next = setMilkReminderSettings({ warnBeforeMinutes: minutes })
    setMilkReminder(next)
    try {
      await syncMilkReminderSettingsToServer(next)
    } catch {
      /* keep local */
    }
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
        <h2 className="font-heading mb-1 font-semibold text-foreground">
          Tampilan Beranda
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Off di perangkat = hanya di HP ini. Off untuk semua = semua user.
          Tampil jika keduanya On.
        </p>
        <div className="mb-2 flex items-center justify-end gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="w-16 text-center">Lokal</span>
          <span className="w-16 text-center">Semua</span>
        </div>
        <div className="space-y-2">
          {HOME_VISIBILITY_OPTIONS.map((opt) => {
            const localOn = homeLocal[opt.key]
            const globalOn = homeGlobal[opt.key]
            return (
              <div
                key={opt.key}
                className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-3"
              >
                <span className="min-w-0 flex-1 text-left text-sm font-semibold text-foreground">
                  <span className="block">{opt.label}</span>
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {opt.hint}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleHomeLocal(opt.key)}
                    className={`w-16 rounded-lg py-2 text-[11px] font-bold ${
                      localOn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground'
                    }`}
                  >
                    {localOn ? 'On' : 'Off'}
                  </button>
                  <button
                    type="button"
                    disabled={homeGlobalLoading || homeGlobalSaving}
                    onClick={() => toggleHomeGlobal(opt.key)}
                    className={`w-16 rounded-lg py-2 text-[11px] font-bold disabled:opacity-50 ${
                      globalOn
                        ? 'bg-sky-600 text-white'
                        : 'bg-card text-muted-foreground'
                    }`}
                  >
                    {globalOn ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-1 font-semibold text-foreground">
          Milk Storage
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Grid botol di beranda. Default 1×4.
        </p>
        <p className="mb-3 text-[11px] text-muted-foreground/90">
          Notif botol ASI via push — tetap jalan saat app ditutup (butuh VAPID +
          cron).
        </p>

        <div className="mb-4 rounded-xl border border-border/60 bg-secondary/30 p-3">
          <p className="mb-2 text-xs font-medium text-foreground">
            Pengingat expired
          </p>
          <button
            type="button"
            onClick={toggleMilkReminder}
            className={`mb-3 w-full rounded-xl py-2.5 text-sm font-semibold ${
              milkReminder.enabled
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            }`}
          >
            {milkReminder.enabled ? '🔔 On' : '🔕 Off'}
          </button>
          {milkReminder.enabled && (
            <MilkWarnPicker
              totalMinutes={milkReminder.warnBeforeMinutes}
              onChange={setMilkWarnBefore}
            />
          )}
        </div>

        <p className="mb-2 text-xs font-medium text-muted-foreground">Baris</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {MILK_STORAGE_ROWS_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={milkLayoutSaving}
              onClick={() => saveMilkLayout({ rows: n })}
              className={`min-w-[2.75rem] rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                milkLayout.rows === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Botol per baris
        </p>
        <div className="flex flex-wrap gap-2">
          {MILK_STORAGE_COLS_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={milkLayoutSaving}
              onClick={() => saveMilkLayout({ cols: n })}
              className={`min-w-[2.75rem] rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                milkLayout.cols === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Total: {milkLayout.rows * milkLayout.cols} botol
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">
          Pengingat Menyusui
        </h2>
        <button
          type="button"
          onClick={toggleFeedingReminders}
          className={`mb-3 w-full rounded-xl py-3 text-sm font-semibold ${
            reminders.feedingEnabled
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground'
          }`}
        >
          {reminders.feedingEnabled ? '🔔 On' : '🔕 Off'}
        </button>
        {reminders.feedingEnabled && (
          <ReminderIntervalPicker
            totalMinutes={reminders.feedingIntervalMinutes}
            onChange={setFeedingInterval}
          />
        )}
        <p className="mt-3 text-[11px] text-muted-foreground/90">
          On = push notif, tetap jalan saat app ditutup.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">
          Pengingat Popok
        </h2>
        <button
          type="button"
          onClick={toggleDiaperReminders}
          className={`mb-3 w-full rounded-xl py-3 text-sm font-semibold ${
            reminders.diaperEnabled
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground'
          }`}
        >
          {reminders.diaperEnabled ? '🔔 On' : '🔕 Off'}
        </button>
        {reminders.diaperEnabled && (
          <ReminderIntervalPicker
            totalMinutes={reminders.diaperIntervalMinutes}
            onChange={setDiaperInterval}
          />
        )}
        <p className="mt-3 text-[11px] text-muted-foreground/90">
          On = push notif, tetap jalan saat app ditutup.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-heading mb-3 font-semibold text-foreground">Data</h2>
        <p className="mb-2 text-xs text-muted-foreground">Rentang riwayat</p>
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
            {exporting ? '...' : '📥 Riwayat'}
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
            {exporting ? '...' : '📄 Riwayat PDF'}
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
