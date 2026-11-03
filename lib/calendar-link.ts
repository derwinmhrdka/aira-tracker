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

export function buildIcs(event: CalendarDraft) {
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

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent)
}

/** Opens Google Calendar on the prefilled new-event screen. */
export function openGoogleCalendar(event: CalendarDraft) {
  const url = googleUrl(event)
  if (isAndroid()) {
    const path = url.replace(/^https:\/\//, '')
    window.location.href = `intent://${path}#Intent;scheme=https;package=com.google.android.calendar;S.browser_fallback_url=${encodeURIComponent(url)};end`
    return
  }
  if (isIOS()) {
    const started = Date.now()
    window.location.href = `comgooglecalendarurl://${url.replace(/^https:\/\//, '')}`
    window.setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - started < 2000) {
        window.location.href = url
      }
    }, 900)
    return
  }
  window.location.href = url
}

/** Opens Apple Calendar's Add Event card. A real .ics address is required; a blob only downloads. */
export function addToIosCalendar(event: CalendarDraft) {
  const params = new URLSearchParams({
    title: event.title,
    start: event.start_at,
    end: event.end_at,
  })
  if (event.location) params.set('location', event.location)
  if (event.meet_with) params.set('meet', event.meet_with)
  if (event.notes) params.set('notes', event.notes)
  window.location.assign(`/acara.ics?${params.toString()}`)
}
