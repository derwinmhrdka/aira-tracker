import type { LoggedBy } from '@/lib/types'
import {
  enqueue,
  isQueueableUrl,
  isNetworkFailure,
  isOffline,
} from '@/lib/offline-queue'

const LOGGED_BY_KEY = 'baby_tracker_logged_by'

export function getLoggedBy(): LoggedBy | undefined {
  if (typeof window === 'undefined') return undefined
  const value = localStorage.getItem(LOGGED_BY_KEY)
  if (value === 'AYAH' || value === 'IBU' || value === 'PENGASUH') {
    return value
  }
  return undefined
}

export function setLoggedBy(value: LoggedBy) {
  localStorage.setItem(LOGGED_BY_KEY, value)
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const loggedBy = getLoggedBy()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body
      ? JSON.stringify({
          ...JSON.parse(options.body as string),
          ...(loggedBy ? { logged_by: loggedBy } : {}),
        })
      : undefined,
  }).catch((err) => {
    const method = options.method || 'GET'
    const bodyStr = options.body
      ? JSON.stringify({
          ...JSON.parse(options.body as string),
          ...(loggedBy ? { logged_by: loggedBy } : {}),
        })
      : null

    if (
      (isOffline() || isNetworkFailure(err)) &&
      isQueueableUrl(url, method)
    ) {
      enqueue({
        url,
        method,
        headers,
        body: bodyStr,
      })
      return null
    }
    throw err
  })

  if (res === null) {
    return {} as T
  }

  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg =
      (data as { error?: string }).error ||
      `Request failed (${res.status})`
    throw new Error(msg)
  }

  return res.json()
}

export const api = {
  login: (pin: string, loggedBy?: LoggedBy) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, logged_by: loggedBy }),
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Login failed')
      }
      return res.json()
    }),

  logout: () =>
    fetch('/api/auth/logout', { method: 'POST' }),

  logDiaper: (type: 'pup' | 'pee' | 'both', notes?: string) =>
    apiFetch('/api/logs/diaper', {
      method: 'POST',
      body: JSON.stringify({ type, notes }),
    }),

  logFeeding: (
    action: 'start' | 'end' | 'quick',
    data?: { side?: string; amount_ml?: number; notes?: string; feed_type?: string }
  ) =>
    apiFetch('/api/logs/feeding', {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
    }),

  logSleep: (action: 'start' | 'end', notes?: string) =>
    apiFetch('/api/logs/sleep', {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    }),

  getTodaySummary: () => apiFetch<TodaySummary>('/api/logs/today'),

  getHistory: (
    days = 7,
    category?: string,
    options?: { limit?: number; cursor?: string; offset?: number }
  ) => {
    const params = new URLSearchParams({ days: String(days) })
    if (category) params.set('category', category)
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.cursor) params.set('cursor', options.cursor)
    if (options?.offset != null) params.set('offset', String(options.offset))
    return apiFetch<HistoryResponse>(`/api/history?${params}`)
  },

  getAllHistory: async (days = 7, category?: string): Promise<HistoryItem[]> => {
    const items: HistoryItem[] = []
    let cursor: string | undefined
    while (true) {
      const params = new URLSearchParams({ days: String(days), limit: '50' })
      if (category) params.set('category', category)
      if (cursor) params.set('cursor', cursor)
      const data = await apiFetch<HistoryResponse>(`/api/history?${params}`)
      items.push(...data.items)
      if (!data.hasMore || !data.nextCursor) break
      cursor = data.nextCursor
    }
    return items
  },

  deleteLog: (category: string, id: string) =>
    fetch(`/api/logs/${category}/${id}`, { method: 'DELETE' }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      return res.json()
    }),

  updateLog: (category: string, id: string, data: UpdateLogInput) =>
    apiFetch<HistoryItem>(`/api/logs/${category}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getStats: (days = 7) => apiFetch<StatsResponse>(`/api/stats?days=${days}`),

  getGrowth: () => apiFetch<GrowthLog[]>('/api/growth'),

  createGrowth: (data: CreateGrowthInput) =>
    apiFetch('/api/growth', { method: 'POST', body: JSON.stringify(data) }),

  updateGrowth: (id: string, data: Partial<CreateGrowthInput>) =>
    apiFetch<GrowthLog>(`/api/growth/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteGrowth: (id: string) =>
    fetch(`/api/growth/${id}`, { method: 'DELETE' }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      return res.json()
    }),

  getNotes: () => apiFetch<DailyNote[]>('/api/notes'),

  createNote: (content: string, photoUrl?: string) =>
    apiFetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ content, photo_url: photoUrl }),
    }),

  getMilestones: () => apiFetch<Milestone[]>('/api/milestones'),

  createMilestone: (data: CreateMilestoneInput) =>
    apiFetch('/api/milestones', { method: 'POST', body: JSON.stringify(data) }),

  updateMilestone: (id: string, data: Partial<CreateMilestoneInput>) =>
    apiFetch<Milestone>(`/api/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteMilestone: (id: string) =>
    fetch(`/api/milestones/${id}`, { method: 'DELETE' }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      return res.json()
    }),

  changePin: (oldPin: string, newPin: string) =>
    apiFetch('/api/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ old_pin: oldPin, new_pin: newPin }),
    }),

  getImmunizations: () => apiFetch<Immunization[]>('/api/immunizations'),

  updateImmunization: (id: string, data: Partial<Immunization>) =>
    apiFetch<Immunization>(`/api/immunizations`, {
      method: 'PATCH',
      body: JSON.stringify({ id, ...data }),
    }),

  createImmunization: (data: {
    vaccine_name: string
    scheduled_age_months: number
    notes?: string
  }) =>
    apiFetch<Immunization>('/api/immunizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteImmunization: (id: string) =>
    fetch(`/api/immunizations/${id}`, { method: 'DELETE' }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      return res.json()
    }),

  getDevelopmentChecklist: () =>
    apiFetch<DevelopmentItem[]>('/api/development-checklist'),

  updateDevelopmentChecklist: (id: string, isChecked: boolean) =>
    apiFetch<Pick<DevelopmentItem, 'is_checked' | 'date_checked'>>(
      '/api/development-checklist',
      {
        method: 'PATCH',
        body: JSON.stringify({ id, is_checked: isChecked }),
      }
    ),

  uploadPhoto: async (file: File): Promise<{ photo_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }
      return res.json()
    } catch (err) {
      if (isOffline() || isNetworkFailure(err)) {
        const { storeOfflinePhoto } = await import('@/lib/offline-photos')
        const photo_url = await storeOfflinePhoto(file)
        return { photo_url }
      }
      throw err
    }
  },

  getBabyProfile: () => apiFetch<BabyProfile>('/api/baby-profile'),

  updateBabyProfile: (data: Partial<BabyProfile>) =>
    apiFetch<BabyProfile>('/api/baby-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  exportBackup: () => apiFetch<BackupData>('/api/backup'),

  restoreBackup: (data: BackupData) =>
    apiFetch<{ success: boolean; restored: Record<string, number> }>(
      '/api/backup/restore',
      { method: 'POST', body: JSON.stringify(data) }
    ),
}

export interface TodaySummary {
  counts: { pup: number; pee: number; feed: number; sleep: number }
  lastTimes: {
    pup: string | null
    pee: string | null
    feed: string | null
    sleep: string | null
  }
  activeFeeding: boolean
  activeSleep: boolean
  activeFeedingStart?: string | null
  activeSleepStart?: string | null
  totalSleepMinutes?: number
  baby?: {
    name: string
    birth_date: string
    age_label: string | null
    photo_url?: string | null
  } | null
  nextVaccine?: {
    name: string
    age_months: number
    status?: 'overdue' | 'due' | 'upcoming'
  } | null
}

export interface HistoryItem {
  id: string
  category: 'diaper' | 'feeding' | 'sleep' | 'note'
  type: string
  timestamp: string
  timestampEnd?: string | null
  details?: string | null
  loggedBy?: string | null
  diaper_type?: 'pup' | 'pee' | 'both'
  side?: string | null
  feed_type?: string | null
  amount_ml?: number | null
  notes?: string | null
  content?: string | null
  photo_url?: string | null
}

export interface UpdateLogInput {
  timestamp?: string
  timestamp_end?: string | null
  type?: 'pup' | 'pee' | 'both'
  side?: string
  feed_type?: string
  amount_ml?: number | null
  notes?: string | null
  content?: string
  logged_by?: string
}

export interface HistoryResponse {
  items: HistoryItem[]
  hasMore: boolean
  nextCursor: string | null
  nextOffset: number | null
}

export interface StatsResponse {
  days: number
  period: {
    pup: number
    pee: number
    feed: number
    sleepHours: number
  }
  daily: {
    date: string
    label: string
    pup: number
    pee: number
    feed: number
    sleepHours: number
  }[]
  growth: GrowthLog[]
  insights: {
    avgSleepHours: number | null
    avgFeedingIntervalHours: number | null
  }
}

export interface GrowthLog {
  id: string
  date: string
  weight_kg: number
  height_cm: number
  is_jaundice: boolean
  bilirubin_level?: number | null
  notes?: string | null
}

export interface CreateGrowthInput {
  date: string
  weight_kg: number
  height_cm: number
  is_jaundice?: boolean
  bilirubin_level?: number
  notes?: string
}

export interface DailyNote {
  id: string
  timestamp: string
  content: string
  photo_url?: string | null
  logged_by?: string | null
}

export interface Milestone {
  id: string
  date: string
  title: string
  description?: string | null
  photo_url?: string | null
}

export interface CreateMilestoneInput {
  date: string
  title: string
  description?: string
  photo_url?: string
}

export interface Immunization {
  id: string
  vaccine_name: string
  scheduled_age_months: number
  is_done: boolean
  date_given?: string | null
  notes?: string | null
  is_custom?: boolean
  status?: 'done' | 'overdue' | 'due' | 'upcoming'
}

export interface DevelopmentItem {
  id: string
  age_group_months: number
  question: string
  is_checked: boolean
  date_checked?: string | null
}

export interface BabyProfile {
  id: string
  name: string
  birth_date: string
  birth_weight_kg?: number | null
  birth_height_cm?: number | null
  blood_type?: string | null
  parent_names?: string | null
  photo_url?: string | null
  gender?: 'MALE' | 'FEMALE' | null
}

export interface BackupData {
  version: number
  exported_at: string
  profile: Omit<BabyProfile, 'id'> | null
  diaper_logs: unknown[]
  feeding_logs: unknown[]
  sleep_logs: unknown[]
  growth_logs: unknown[]
  daily_notes: unknown[]
  milestones: unknown[]
  immunizations: unknown[]
  development: unknown[]
}
