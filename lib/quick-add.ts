'use client'

import { useEffect } from 'react'
import type { AppPage } from '@/lib/navigation'

export type QuickAddTarget = 'event' | 'immunization' | 'milestone'

const EVENT = 'aira-quick-add'
let pending: QuickAddTarget | null = null

export function requestQuickAdd(target: QuickAddTarget) {
  pending = target
  window.dispatchEvent(new CustomEvent(EVENT, { detail: target }))
}

export function useQuickAdd(target: QuickAddTarget, onOpen: () => void) {
  useEffect(() => {
    const open = () => {
      if (pending !== target) return
      pending = null
      onOpen()
    }
    open()
    window.addEventListener(EVENT, open)
    return () => window.removeEventListener(EVENT, open)
  }, [target, onOpen])
}

export const QUICK_ADD_PAGE: Record<QuickAddTarget | 'history', AppPage> = {
  event: 'events',
  immunization: 'immunizations',
  history: 'history',
  milestone: 'milestones',
}
