/** Shown until the browser zone is known. Same text on the server and the first client render. */
export const LOCAL_TIME_FALLBACK = 'Local time'

/**
 * A launch clock for a visitor. Before the client zone is ready, return a stable
 * fallback so the page never paints UTC and then swaps it.
 */
export function textWhenReady(
  iso: string | null | undefined,
  timeZone: string | null,
  ready: boolean,
  format: (iso: string, timeZone: string) => string,
): string {
  if (!iso) return 'Time not set'
  if (Number.isNaN(new Date(iso).getTime())) return 'Time not set'
  if (!ready || !timeZone) return LOCAL_TIME_FALLBACK
  return format(iso, timeZone)
}

export function formatWhen(iso: string, timeZone?: string, locale = 'en-US'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Time not set'
  return new Intl.DateTimeFormat(locale, {
    timeZone: timeZone || 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

export function formatClock(iso: string, timeZone?: string, locale = 'en-US'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return new Intl.DateTimeFormat(locale, {
    timeZone: timeZone || 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function countdownParts(targetIso: string | null, nowMs: number): {
  mode: 'tbd' | 'down' | 'up' | 'done'
  digits: string
  spoken: string
} {
  if (!targetIso) {
    return { mode: 'tbd', digits: 'TBD', spoken: 'Launch time is not set yet.' }
  }
  const target = Date.parse(targetIso)
  if (!Number.isFinite(target)) {
    return { mode: 'tbd', digits: 'TBD', spoken: 'Launch time is not set yet.' }
  }
  const delta = target - nowMs
  if (delta > 0) {
    return { mode: 'down', digits: formatSpan(delta), spoken: `Liftoff in ${spokenSpan(delta)}.` }
  }
  const since = -delta
  if (since < 3 * 60 * 60 * 1000) {
    return { mode: 'up', digits: formatSpan(since), spoken: `Liftoff was ${spokenSpan(since)} ago.` }
  }
  return { mode: 'done', digits: 'DONE', spoken: 'This launch has already happened.' }
}

function formatSpan(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return days > 0 ? `${days}d ${clock}` : clock
}

function spokenSpan(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60000))
  const days = Math.floor(total / (60 * 24))
  const hours = Math.floor((total % (60 * 24)) / 60)
  const minutes = total % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  if (minutes > 0 && days === 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
  if (parts.length === 0) return 'less than a minute'
  return parts.join(' and ')
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function hourKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:00`
}
