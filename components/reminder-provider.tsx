'use client'

import { useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'
import {
  getReminderSettings,
  isAnyReminderEnabled,
  showFeedingReminder,
  showDiaperReminder,
} from '@/lib/reminder'
import { checkServerPushReminder } from '@/lib/push-client'

const LAST_FEEDING_NOTIFY_KEY = 'last_feeding_notify_at'
const LAST_DIAPER_NOTIFY_KEY = 'last_diaper_notify_at'
const REMINDER_COOLDOWN_MS = 30 * 60 * 1000

function readLastNotify(key: string): number {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem(key)
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function writeLastNotify(key: string, value: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, String(value))
}

export function ReminderProvider() {
  const lastFeedingNotified = useRef<number>(readLastNotify(LAST_FEEDING_NOTIFY_KEY))
  const lastDiaperNotified = useRef<number>(readLastNotify(LAST_DIAPER_NOTIFY_KEY))

  useEffect(() => {
    const check = async () => {
      const settings = getReminderSettings()
      if (!isAnyReminderEnabled(settings)) return

      try {
        const summary = await api.getTodaySummary()

        if (settings.feedingEnabled) {
          const serverSent = await checkServerPushReminder(
            'feeding',
            settings.feedingIntervalMinutes
          )
          if (serverSent) {
            const now = Date.now()
            lastFeedingNotified.current = now
            writeLastNotify(LAST_FEEDING_NOTIFY_KEY, now)
          } else if (!summary.activeFeeding) {
            const lastFeedAction = summary.lastFeedingEnd ?? summary.lastTimes.feed
            if (lastFeedAction) {
              const minutesSince =
                (Date.now() - new Date(lastFeedAction).getTime()) / (1000 * 60)

              if (minutesSince >= settings.feedingIntervalMinutes) {
                const now = Date.now()
                if (now - lastFeedingNotified.current > REMINDER_COOLDOWN_MS) {
                  await showFeedingReminder(summary.baby?.name)
                  lastFeedingNotified.current = now
                  writeLastNotify(LAST_FEEDING_NOTIFY_KEY, now)
                }
              }
            }
          }
        }

        if (settings.diaperEnabled) {
          const serverSent = await checkServerPushReminder(
            'diaper',
            settings.diaperIntervalMinutes
          )
          if (serverSent) {
            const now = Date.now()
            lastDiaperNotified.current = now
            writeLastNotify(LAST_DIAPER_NOTIFY_KEY, now)
          } else {
            const lastDiaper =
              summary.lastDiaper ??
              [summary.lastTimes.pup, summary.lastTimes.pee, summary.lastTimes.change]
                .filter((t): t is string => !!t)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
              null
            if (lastDiaper) {
              const minutesSince =
                (Date.now() - new Date(lastDiaper).getTime()) / (1000 * 60)

              if (minutesSince >= settings.diaperIntervalMinutes) {
                const now = Date.now()
                if (now - lastDiaperNotified.current > REMINDER_COOLDOWN_MS) {
                  await showDiaperReminder(summary.baby?.name)
                  lastDiaperNotified.current = now
                  writeLastNotify(LAST_DIAPER_NOTIFY_KEY, now)
                }
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    check()
    const id = setInterval(check, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return null
}
