export type CalendarDraft = {
  title: string
  location?: string | null
  meet_with?: string | null
  start_at: string
  end_at: string
  notes?: string | null
}

function calendarDetails(event: CalendarDraft) {
  const lines: string[] = []
  if (event.meet_with) lines.push(`Bertemu: ${event.meet_with}`)
  if (event.notes) lines.push(event.notes)
  return lines.join('\n')
}

function utcStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function icsEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function buildIcs(event: CalendarDraft) {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@aira-tracker`
  const details = calendarDetails(event)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aira Tracker//Event//ID',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date().toISOString())}`,
    `DTSTART:${utcStamp(event.start_at)}`,
    `DTEND:${utcStamp(event.end_at)}`,
    `SUMMARY:${icsEscape(event.title)}`,
  ]
  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`)
  if (details) lines.push(`DESCRIPTION:${icsEscape(details)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

function googleUrl(event: CalendarDraft) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${utcStamp(event.start_at)}/${utcStamp(event.end_at)}`,
  })
  if (event.location) params.set('location', event.location)
  const details = calendarDetails(event)
  if (details) params.set('details', details)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export async function openGoogleCalendar(event: CalendarDraft): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = googleUrl(event)
  const text = calendarDetails(event) || event.title
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: event.title, text, url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'cancelled'
  }
}

function downloadIcs(ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'acara.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function addToIosCalendar(event: CalendarDraft): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const ics = buildIcs(event)
  const file = new File([ics], 'acara.ics', { type: 'text/calendar' })
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: event.title })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  downloadIcs(ics)
  return 'downloaded'
}
