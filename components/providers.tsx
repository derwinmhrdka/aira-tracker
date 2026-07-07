'use client'

import { ThemeProvider } from '@/lib/theme-context'
import { ReminderProvider } from '@/components/reminder-provider'
import { OfflineSyncProvider } from '@/components/offline-sync-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <ReminderProvider />
      <OfflineSyncProvider />
    </ThemeProvider>
  )
}
