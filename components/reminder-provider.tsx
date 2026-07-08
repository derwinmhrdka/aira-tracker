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

export function ReminderProvider() {
  const lastFeedingNotified = useRef<number>(0)
  const lastDiaperNotified = useRef<number>(0)

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
            lastFeedingNotified.current = Date.now()
          } else {
            const lastFeed = summary.lastTimes.feed
            if (lastFeed) {
              const minutesSince =
                (Date.now() - new Date(lastFeed).getTime()) / (1000 * 60)

              if (minutesSince >= settings.feedingIntervalMinutes) {
                const now = Date.now()
                if (now - lastFeedingNotified.current > 30 * 60 * 1000) {
                  await showFeedingReminder(summary.baby?.name)
                  lastFeedingNotified.current = now
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
            lastDiaperNotified.current = Date.now()
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
                if (now - lastDiaperNotified.current > 30 * 60 * 1000) {
                  await showDiaperReminder(summary.baby?.name)
                  lastDiaperNotified.current = now
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
