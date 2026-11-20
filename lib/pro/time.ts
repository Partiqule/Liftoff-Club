export const MOUNTAIN = 'America/Denver'

/** A coarse public NET is a date, not a clock. Midnight UTC must not become 5:00 PM MT. */
export function zoneAbbrev(zone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(date)
    return parts.find((part) => part.type === 'timeZoneName')?.value || zone
  } catch {
    return zone
  }
}

/** Settings sentence. With no town, skip the repeated UTC pair. */
export function zoneStatusCopy(zone: string, mode: 'auto' | 'chosen', hasTown: boolean): string {
  if (!hasTown && mode !== 'chosen') return 'Times follow this device.'
  const abbrev = zoneAbbrev(zone).replace(/\s+/g, ' ').trim()
  const id = zone.trim()
  const same = abbrev.length === 0 || abbrev.toLowerCase() === id.toLowerCase()
  const named = same ? abbrev || id : `${abbrev} (${id})`
  const tail = mode === 'auto' ? 'That follows this device.' : 'You chose this zone.'
  return `Times use ${named}. ${tail}`
}

export function isTimeZone(zone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

export function formatLaunchWhen(
  iso: string | null | undefined,
  precision: string | null | undefined,
  statusName?: string | null,
  zone: string = MOUNTAIN,
): string {
  if (!iso) return 'Time not set'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Time not set'
  const coarse = `${precision ?? ''} ${statusName ?? ''}`.toLowerCase()
  const placeholder = /00:00:00/.test(iso) && /tbd|to be determined|month|quarter|year|day/.test(coarse)
  if (/year/.test(coarse) && !/month|day|hour|minute|second/.test(precision ?? '')) {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric' }).format(date)
  }
  if (/month|quarter/.test(coarse) || (placeholder && /month|quarter|tbd|to be determined/.test(coarse))) {
    const month = new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'long', year: 'numeric' }).format(date)
    return `${month}, clock not set`
  }
  if (/\bday\b/.test(coarse) || placeholder) {
    const day = new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'short', day: 'numeric', year: 'numeric' }).format(date)
    return `${day}, clock not set`
  }
  return formatMountain(iso, zone)
}

export function formatMountain(iso: string | null | undefined, zone: string = MOUNTAIN): string {
  if (!iso) return 'Time not set'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Time not set'
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
  return `${formatted} ${zoneAbbrev(zone, date)}`
}

export function mountainMonth(iso: string): number | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: MOUNTAIN, month: 'numeric' }).format(date))
  return Number.isFinite(month) ? month - 1 : null
}

export function mountainYear(iso: string | number): number | null {
  const date = typeof iso === 'number' ? new Date(iso) : new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const year = new Intl.DateTimeFormat('en-US', { timeZone: MOUNTAIN, year: 'numeric' }).format(date)
  const parsed = Number(year)
  return Number.isFinite(parsed) ? parsed : null
}

export function utcDay(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}
