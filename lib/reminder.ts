export const MIN_REMINDER_MINUTES = 15
export const MAX_REMINDER_MINUTES = 12 * 60

export const DEFAULT_FEEDING_INTERVAL_MINUTES = 180
export const DEFAULT_DIAPER_INTERVAL_MINUTES = 180

export interface ReminderSettings {
  feedingEnabled: boolean
  feedingIntervalMinutes: number
  diaperEnabled: boolean
  diaperIntervalMinutes: number
}

const KEY = 'baby_tracker_reminders'

const DEFAULTS: ReminderSettings = {
  feedingEnabled: false,
  feedingIntervalMinutes: DEFAULT_FEEDING_INTERVAL_MINUTES,
  diaperEnabled: false,
  diaperIntervalMinutes: DEFAULT_DIAPER_INTERVAL_MINUTES,
}

export function clampReminderMinutes(minutes: number): number {
  return Math.min(MAX_REMINDER_MINUTES, Math.max(MIN_REMINDER_MINUTES, Math.round(minutes)))
}

export function combineIntervalMinutes(hours: number, minutes: number): number {
  const h = Math.max(0, Math.min(12, Math.floor(hours) || 0))
  const m = Math.max(0, Math.min(59, Math.floor(minutes) || 0))
  return clampReminderMinutes(h * 60 + m)
}

export function splitIntervalMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const clamped = clampReminderMinutes(totalMinutes)
  return {
    hours: Math.floor(clamped / 60),
    minutes: clamped % 60,
  }
}

export function formatReminderInterval(totalMinutes: number): string {
  const { hours, minutes } = splitIntervalMinutes(totalMinutes)
  if (hours === 0) return `${minutes} menit`
  if (minutes === 0) return `${hours} jam`
  return `${hours} jam ${minutes} menit`
}

export function parseReminderMinutes(
  minutes?: unknown,
  hours?: unknown,
  fallback = DEFAULT_FEEDING_INTERVAL_MINUTES
): number {
  if (typeof minutes === 'number' && !Number.isNaN(minutes)) {
    return clampReminderMinutes(minutes)
  }
  if (typeof hours === 'number' && !Number.isNaN(hours)) {
    return clampReminderMinutes(Math.round(hours * 60))
  }
  return fallback
}

export function reminderMinutesToStoredHours(minutes: number): number {
  return clampReminderMinutes(minutes) / 60
}

export function storedHoursToReminderMinutes(hours: number): number {
  return clampReminderMinutes(Math.round(hours * 60))
}

/** Fallback interval from env; safe when vars are unset or empty. */
export function envReminderMinutes(
  minutesKey: string,
  hoursKey: string,
  defaultMinutes: number
): number {
  const rawMinutes = process.env[minutesKey]?.trim()
  if (rawMinutes) {
    const minutes = Number(rawMinutes)
    if (Number.isFinite(minutes) && minutes > 0) {
      return clampReminderMinutes(minutes)
    }
  }

  const rawHours = process.env[hoursKey]?.trim()
  if (rawHours) {
    const hours = Number(rawHours)
    if (Number.isFinite(hours) && hours > 0) {
      return clampReminderMinutes(Math.round(hours * 60))
    }
  }

  return defaultMinutes
}

function normalizeSettings(raw: Record<string, unknown>): ReminderSettings {
  const feedingEnabled =
    typeof raw.feedingEnabled === 'boolean'
      ? raw.feedingEnabled
      : typeof raw.enabled === 'boolean'
        ? raw.enabled
        : DEFAULTS.feedingEnabled

  const feedingIntervalMinutes =
    typeof raw.feedingIntervalMinutes === 'number'
      ? clampReminderMinutes(raw.feedingIntervalMinutes)
      : typeof raw.feedingIntervalHours === 'number'
        ? clampReminderMinutes(Math.round(raw.feedingIntervalHours * 60))
        : DEFAULTS.feedingIntervalMinutes

  const diaperIntervalMinutes =
    typeof raw.diaperIntervalMinutes === 'number'
      ? clampReminderMinutes(raw.diaperIntervalMinutes)
      : typeof raw.diaperIntervalHours === 'number'
        ? clampReminderMinutes(Math.round(raw.diaperIntervalHours * 60))
        : DEFAULTS.diaperIntervalMinutes

  return {
    feedingEnabled,
    feedingIntervalMinutes,
    diaperEnabled:
      typeof raw.diaperEnabled === 'boolean'
        ? raw.diaperEnabled
        : DEFAULTS.diaperEnabled,
    diaperIntervalMinutes,
  }
}

export function getReminderSettings(): ReminderSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalizeSettings(JSON.parse(raw)) : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function setReminderSettings(settings: Partial<ReminderSettings>) {
  const next = normalizeSettings({ ...getReminderSettings(), ...settings })
  localStorage.setItem(KEY, JSON.stringify(next))
  syncReminderToServiceWorker(next)
  return next
}

export function isAnyReminderEnabled(settings = getReminderSettings()) {
  return settings.feedingEnabled || settings.diaperEnabled
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

function syncReminderToServiceWorker(settings: ReminderSettings) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
  navigator.serviceWorker.controller.postMessage({
    type: 'SYNC_REMINDER_SETTINGS',
    settings,
  })
}

async function showLocalNotification(
  type: 'SHOW_FEEDING_REMINDER' | 'SHOW_DIAPER_REMINDER',
  title: string,
  body: string,
  tag: string
) {
  const registration = await getServiceWorkerRegistration()
  if (registration?.active) {
    registration.active.postMessage({ type, title, body, tag })
    return
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.svg', tag })
  }
}

export async function showFeedingReminder(babyName?: string) {
  const title = 'Waktunya menyusui 🍼'
  const body = babyName
    ? `${babyName} mungkin sudah lapar — cek jadwal menyusui`
    : 'Sudah waktunya cek jadwal menyusui'
  await showLocalNotification('SHOW_FEEDING_REMINDER', title, body, 'feeding-reminder')
}

export async function showDiaperReminder(babyName?: string) {
  const title = 'Waktunya popok'
  const body = babyName
    ? `Cek popok ${babyName} — sudah waktunya`
    : 'Sudah waktunya cek popok'
  await showLocalNotification('SHOW_DIAPER_REMINDER', title, body, 'diaper-reminder')
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const settings = getReminderSettings()
    registration.active?.postMessage({
      type: 'SYNC_REMINDER_SETTINGS',
      settings,
    })
  } catch {
    // SW registration optional
  }
}
