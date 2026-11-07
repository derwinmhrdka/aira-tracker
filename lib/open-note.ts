'use client'

import { useEffect } from 'react'

const EVENT = 'aira-open-note'
let pendingId: string | null = null

export function requestOpenNote(id: string) {
  pendingId = id
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }))
}

export function useOpenNote(onOpen: (id: string) => void) {
  useEffect(() => {
    const open = () => {
      if (!pendingId) return
      const id = pendingId
      pendingId = null
      onOpen(id)
    }
    open()
    window.addEventListener(EVENT, open)
    return () => window.removeEventListener(EVENT, open)
  }, [onOpen])
}
