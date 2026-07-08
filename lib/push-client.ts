function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function subscribeToPush(intervalHours = 3): Promise<boolean> {
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
      feeding_reminder_hours: intervalHours,
    }),
  })

  return res.ok
}

export async function updatePushReminderInterval(
  intervalHours: number
): Promise<void> {
  await fetch('/api/push/subscribe', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feeding_reminder_hours: intervalHours }),
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

export async function checkServerPushReminder(intervalHours: number): Promise<boolean> {
  const res = await fetch('/api/push/check-reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval_hours: intervalHours }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return Boolean(data.sent)
}
