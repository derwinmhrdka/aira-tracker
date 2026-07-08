function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export type PushSubscribeOptions = {
  feedingIntervalMinutes?: number
  feedingReminderEnabled?: boolean
  diaperIntervalMinutes?: number
  diaperReminderEnabled?: boolean
}

export async function subscribeToPush(
  options: PushSubscribeOptions | number = {}
): Promise<boolean> {
  const opts =
    typeof options === 'number'
      ? { feedingIntervalMinutes: options }
      : options

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const keyRes = await fetch('/api/push/vapid-public-key')
  if (!keyRes.ok) return false

  const { publicKey } = await keyRes.json()
  const registration = await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...subscription.toJSON(),
      feeding_reminder_minutes: opts.feedingIntervalMinutes ?? 180,
      feeding_reminder_enabled: opts.feedingReminderEnabled !== false,
      diaper_reminder_minutes: opts.diaperIntervalMinutes ?? 180,
      diaper_reminder_enabled: opts.diaperReminderEnabled ?? false,
    }),
  })

  return res.ok
}

export async function updatePushReminderSettings(
  settings: PushSubscribeOptions
): Promise<void> {
  await fetch('/api/push/subscribe', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feeding_reminder_minutes: settings.feedingIntervalMinutes,
      feeding_reminder_enabled: settings.feedingReminderEnabled,
      diaper_reminder_minutes: settings.diaperIntervalMinutes,
      diaper_reminder_enabled: settings.diaperReminderEnabled,
    }),
  })
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    await subscription.unsubscribe()
  }
}

export async function checkServerPushReminder(
  type: 'feeding' | 'diaper',
  intervalMinutes: number
): Promise<boolean> {
  const res = await fetch('/api/push/check-reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, interval_minutes: intervalMinutes }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return Boolean(data.sent)
}
