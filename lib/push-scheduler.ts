import { runAllPushReminders } from '@/lib/run-push-reminders'
import { isPushConfigured } from '@/lib/push-server'
import {
  computeSchedulerDelay,
  getNextReminderDueAt,
} from '@/lib/next-push-reminder-at'

const STARTUP_DELAY_MS = 45_000

let started = false
let timer: ReturnType<typeof setTimeout> | null = null

async function tick() {
  try {
    await runAllPushReminders()
  } catch (err) {
    console.error('[push-scheduler]', err)
  }

  try {
    const nextAt = await getNextReminderDueAt()
    const delay = computeSchedulerDelay(nextAt)
    timer = setTimeout(tick, Math.max(delay, 1000))
  } catch (err) {
    console.error('[push-scheduler] reschedule failed:', err)
    timer = setTimeout(tick, 60_000)
  }
}

/** Scheduler in-app — push dijadwalkan sesuai waktu reminder, tetap jalan saat PWA ditutup. */
export function startPushScheduler() {
  if (started) return
  if (process.env.NODE_ENV !== 'production') return
  if (!isPushConfigured()) return

  started = true
  timer = setTimeout(tick, STARTUP_DELAY_MS)
  console.log(
    '[push-scheduler] started — push dijadwalkan sesuai waktu reminder (presisi ~1 menit)'
  )
}
