import type { LoggedBy } from '@/lib/types'
import { isManagedUploadUrl } from '@/lib/upload-url'
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
    cache: 'no-store',
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
    return { queued: true } as T
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

function isTodaySummary(data: unknown): data is TodaySummary {
  if (!data || typeof data !== 'object') return false
  const counts = (data as TodaySummary).counts
  return (
    !!counts &&
    typeof counts.pup === 'number' &&
    typeof counts.pee === 'number' &&
    typeof counts.feed === 'number' &&
    typeof counts.sleep === 'number' &&
    (typeof counts.change === 'number' || counts.change === undefined)
  )
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

  logDiaper: (type: 'pup' | 'pee' | 'both' | 'change', notes?: string) =>
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

  getTodaySummary: async () => {
    const data = await apiFetch<TodaySummary>('/api/logs/summary')
    if (!isTodaySummary(data)) {
      throw new Error('Invalid today summary response')
    }
    return data
  },

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

  getTimeline: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : ''
    return apiFetch<TimelineResponse>(`/api/timeline${qs}`)
  },

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

  getNotes: (options?: { limit?: number; cursor?: string }) => {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.cursor) params.set('cursor', options.cursor)
    const qs = params.toString()
    return apiFetch<NotesResponse>(`/api/notes${qs ? `?${qs}` : ''}`)
  },

  getGallery: (options?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.offset != null) params.set('offset', String(options.offset))
    const qs = params.toString()
    return apiFetch<GalleryResponse>(`/api/gallery${qs ? `?${qs}` : ''}`)
  },

  createNote: (content: string, photoUrl?: string, audioUrl?: string) =>
    apiFetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        content: content || undefined,
        photo_url: photoUrl,
        audio_url: audioUrl,
      }),
    }),

  getMilestones: () => apiFetch<Milestone[]>('/api/milestones'),

  getTitles: () => apiFetch<TitleItem[]>('/api/titles'),

  toggleTitle: (id: string) =>
    apiFetch<TitleItem>('/api/titles', {
      method: 'PATCH',
      body: JSON.stringify({ id }),
    }),

  getLatestMood: () =>
    apiFetch<{ latest: MoodLog | null }>('/api/mood?latest=1'),

  createMood: (mood: MoodLog['mood']) =>
    apiFetch<MoodLog>('/api/mood', {
      method: 'POST',
      body: JSON.stringify({ mood }),
    }),

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

  getEvents: (upcomingOnly = false) =>
    apiFetch<CalendarEvent[]>(
      `/api/events${upcomingOnly ? '?upcoming=1' : ''}`
    ),

  createEvent: (data: CreateEventInput) =>
    apiFetch<CalendarEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEvent: (id: string, data: Partial<CreateEventInput>) =>
    apiFetch<CalendarEvent>(`/api/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteEvent: (id: string) =>
    fetch(`/api/events/${id}`, { method: 'DELETE' }).then(async (res) => {
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

  uploadAudio: async (file: File): Promise<{ audio_url: string }> => {
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
        const { storeOfflineAudio } = await import('@/lib/offline-audio')
        const audio_url = await storeOfflineAudio(file)
        return { audio_url }
      }
      throw err
    }
  },

  deleteUpload: (url: string) =>
    apiFetch('/api/upload/cleanup', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

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

export function isQueuedResponse(data: unknown): data is { queued: true } {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { queued?: boolean }).queued === true
  )
}

export async function cleanupDraftUploads(
  current: (string | null | undefined)[],
  saved: (string | null | undefined)[]
) {
  const savedSet = new Set(saved.filter(Boolean))
  for (const url of current) {
    if (isManagedUploadUrl(url) && !savedSet.has(url)) {
      try {
        await api.deleteUpload(url)
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

export interface TodaySummary {
  counts: { pup: number; pee: number; change: number; feed: number; sleep: number }
  lastTimes: {
    pup: string | null
    pee: string | null
    change: string | null
    feed: string | null
    sleep: string | null
  }
  lastFeedingEnd?: string | null
  lastDiaper?: string | null
  lastDurations?: {
    feed: number | null
    sleep: number | null
  }
  activeFeeding: boolean
  activeSleep: boolean
  activeFeedingStart?: string | null
  activeSleepStart?: string | null
  totalSleepMinutes?: number
  totalFeedingMinutes?: number
  baby?: {
    name: string
    birth_date: string
    age_label: string | null
    photo_url?: string | null
    horoscope?: string | null
    horoscope_emoji?: string | null
    shio?: string | null
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
  diaper_type?: 'pup' | 'pee' | 'both' | 'change'
  side?: string | null
  feed_type?: string | null
  amount_ml?: number | null
  notes?: string | null
  content?: string | null
  photo_url?: string | null
  audio_url?: string | null
}

export interface UpdateLogInput {
  timestamp?: string
  timestamp_end?: string | null
  type?: 'pup' | 'pee' | 'both' | 'change'
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
    change: number
    feed: number
    sleepHours: number
  }
  daily: {
    date: string
    label: string
    pup: number
    pee: number
    change: number
    feed: number
    sleepHours: number
    avgFeedingDurationMinutes: number | null
    avgSleepDurationMinutes: number | null
  }[]
  growth: GrowthLog[]
  insights: {
    avgSleepHours: number | null
    avgFeedingIntervalHours: number | null
    avgFeedingDurationMinutes: number | null
    avgPupPerDay: number
    avgPeePerDay: number
    feedSideLeft: number
    feedSideRight: number
  }
}

export interface TimelineEvent {
  id: string
  kind: 'sleep' | 'feeding' | 'pup' | 'pee' | 'change' | 'mood'
  label: string
  emoji: string
  start: string
  end: string | null
  start_min: number
  end_min: number | null
  ongoing: boolean
}

export interface TimelineResponse {
  date: string
  label: string
  prev_date: string
  next_date: string | null
  is_today: boolean
  now_min: number | null
  events: TimelineEvent[]
}

export interface GrowthLog {
  id: string
  date: string
  weight_kg: number
  height_cm: number
  head_circumference_cm?: number | null
  is_jaundice: boolean
  bilirubin_level?: number | null
  notes?: string | null
}

export interface CreateGrowthInput {
  date: string
  weight_kg: number
  height_cm: number
  head_circumference_cm?: number
  is_jaundice?: boolean
  bilirubin_level?: number
  notes?: string
}

export interface NotesResponse {
  items: DailyNote[]
  hasMore: boolean
  nextCursor: string | null
}

export interface GalleryItem {
  id: string
  source: 'note' | 'milestone'
  media_type: 'photo' | 'audio'
  photo_url: string | null
  audio_url: string | null
  caption: string
  timestamp: string
  logged_by: string | null
}

export interface GalleryResponse {
  items: GalleryItem[]
  total: number
  hasMore: boolean
  nextOffset: number | null
}

export interface DailyNote {
  id: string
  timestamp: string
  content: string
  photo_url?: string | null
  audio_url?: string | null
  logged_by?: string | null
}

export interface Milestone {
  id: string
  date: string
  title: string
  description?: string | null
  photo_url?: string | null
}

export interface TitleItem {
  id: string
  category: string
  name: string
  emoji: string
  description: string
  is_unlocked: boolean
  unlocked_at: string | null
}

export interface MoodLog {
  id: string
  timestamp: string
  mood: 'happy' | 'calm' | 'fussy' | 'crying' | 'sleepy'
  logged_by?: string | null
}

export interface CreateMilestoneInput {
  date: string
  title: string
  description?: string
  photo_url?: string
}

export interface CalendarEvent {
  id: string
  title: string
  location?: string | null
  meet_with?: string | null
  start_at: string
  end_at: string
  notes?: string | null
}

export interface CreateEventInput {
  title: string
  location?: string
  meet_with?: string
  start_at: string
  end_at: string
  notes?: string
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
  latest_weight_kg?: number | null
  latest_height_cm?: number | null
  latest_growth_date?: string | null
  blood_type?: string | null
  parent_names?: string | null
  photo_url?: string | null
  gender?: 'MALE' | 'FEMALE' | null
  horoscope?: string | null
  horoscope_emoji?: string | null
  shio?: string | null
  shio_animal?: string | null
  shio_element?: string | null
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
