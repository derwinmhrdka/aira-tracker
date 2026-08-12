const NOTIFIED_KEY = 'baby_tracker_milk_expiry_notified'

type NotifiedMap = Record<string, string> // slotKey -> expires_at iso when notified

function readNotified(): NotifiedMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY)
    return raw ? (JSON.parse(raw) as NotifiedMap) : {}
  } catch {
    return {}
  }
}

function writeNotified(map: NotifiedMap) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map))
}

async function notify(title: string, body: string, tag: string) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration?.active) {
      registration.active.postMessage({
        type: 'SHOW_MILK_EXPIRY_REMINDER',
        title,
        body,
        tag,
      })
      return
    }
  } catch {
    /* fall through */
  }

  new Notification(title, { body, icon: '/icon.svg', tag })
}

export type MilkExpiryCheckSlot = {
  slot_index: number
  amount_ml: number | null
  expires_at: string | null
  is_filled: boolean
}

/** Cek slot yang mau/sudah kadaluarsa dan kirim notifikasi (sekali per expires_at). */
export async function checkMilkExpiryReminders(
  slots: MilkExpiryCheckSlot[],
  warnHours = 6
) {
  const now = Date.now()
  const warnMs = warnHours * 60 * 60 * 1000
  const notified = readNotified()
  let changed = false

  for (const slot of slots) {
    if (!slot.is_filled || !slot.expires_at) continue
    const exp = new Date(slot.expires_at).getTime()
    if (Number.isNaN(exp)) continue
    if (exp - now > warnMs) continue

    const key = `slot-${slot.slot_index}`
    if (notified[key] === slot.expires_at) continue

    const ml = slot.amount_ml ?? '?'
    const expired = exp <= now
    await notify(
      expired ? '🥛 ASI sudah melewati batas waktu' : '🥛 ASI hampir melewati batas',
      expired
        ? `Botol ${slot.slot_index + 1} (${ml} ml) sudah kadaluarsa — cek freezer`
        : `Botol ${slot.slot_index + 1} (${ml} ml) mendekati batas waktu`,
      `milk-expiry-${slot.slot_index}`
    )

    notified[key] = slot.expires_at
    changed = true
  }

  // Cleanup keys for empty / changed slots
  for (const key of Object.keys(notified)) {
    const idx = Number(key.replace('slot-', ''))
    const slot = slots.find((s) => s.slot_index === idx)
    if (!slot?.is_filled || !slot.expires_at) {
      delete notified[key]
      changed = true
    }
  }

  if (changed) writeNotified(notified)
}
