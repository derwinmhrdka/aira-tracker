export interface ReminderSettings {
  enabled: boolean
  feedingIntervalHours: number
}

const KEY = 'baby_tracker_reminders'

const DEFAULTS: ReminderSettings = {
  enabled: false,
  feedingIntervalHours: 3,
}

export function getReminderSettings(): ReminderSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function setReminderSettings(settings: Partial<ReminderSettings>) {
  const next = { ...getReminderSettings(), ...settings }
  localStorage.setItem(KEY, JSON.stringify(next))
  syncReminderToServiceWorker(next)
  return next
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

export async function showFeedingReminder(babyName?: string) {
  const title = 'Waktunya menyusui 🍼'
  const body = babyName
    ? `${babyName} mungkin sudah lapar — cek jadwal menyusui`
    : 'Sudah waktunya cek jadwal menyusui'

  const registration = await getServiceWorkerRegistration()
  if (registration?.active) {
    registration.active.postMessage({
      type: 'SHOW_FEEDING_REMINDER',
      title,
      body,
      tag: 'feeding-reminder',
    })
    return
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: 'feeding-reminder',
    })
  }
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
