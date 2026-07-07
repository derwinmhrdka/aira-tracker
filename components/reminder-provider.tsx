'use client'

import { useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'
import {
  getReminderSettings,
  showFeedingReminder,
} from '@/lib/reminder'
import { checkServerPushReminder } from '@/lib/push-client'

export function ReminderProvider() {
  const lastNotified = useRef<number>(0)

  useEffect(() => {
    const check = async () => {
      const settings = getReminderSettings()
      if (!settings.enabled) return

      try {
        const serverSent = await checkServerPushReminder(
          settings.feedingIntervalHours
        )
        if (serverSent) {
          lastNotified.current = Date.now()
          return
        }

        const summary = await api.getTodaySummary()
        const lastFeed = summary.lastTimes.feed
        if (!lastFeed) return

        const hoursSince =
          (Date.now() - new Date(lastFeed).getTime()) / (1000 * 60 * 60)

        if (hoursSince >= settings.feedingIntervalHours) {
          const now = Date.now()
          if (now - lastNotified.current > 30 * 60 * 1000) {
            await showFeedingReminder(summary.baby?.name)
            lastNotified.current = now
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
