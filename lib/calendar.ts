import type { Launch } from '@/lib/types'

const PRODID = '-//Liftoff Club//Launch Board//EN'

export function launchToIcs(launch: Launch, baseUrl: string, options?: { alarm?: boolean }): string {
  return wrapCalendar([eventBody(launch, baseUrl, options?.alarm ?? true)], 'PUBLISH')
}

export function feedToIcs(
  launches: Launch[],
  baseUrl: string,
  now = Date.now(),
  meta?: { name?: string; description?: string },
): string {
  const events = launches
    .filter((launch) => includeInFeed(launch, now))
    .slice(0, 40)
    .map((launch) => eventBody(launch, baseUrl, false))
  return wrapCalendar(events, 'PUBLISH', true, meta)
}

function includeInFeed(launch: Launch, now: number): boolean {
  if (!launch.net) return false
  const start = Date.parse(launch.net)
  if (!Number.isFinite(start)) return false
  return start > now - 6 * 60 * 60 * 1000
}

function wrapCalendar(
  events: string[],
  method: string,
  subscribe = false,
  meta?: { name?: string; description?: string },
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    `X-WR-CALNAME:${meta?.name ?? 'Liftoff Club'}`,
    `X-WR-CALDESC:${meta?.description ?? 'Rocket launches from the Liftoff Club board. Times update when a launch slips.'}`,
  ]
  if (subscribe) {
    lines.push('REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H')
  }
  return [...lines.map(foldLine), ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n'
}

function eventBody(launch: Launch, baseUrl: string, alarm: boolean): string {
  const uid = `launch-${launch.id}@liftoff.club`
  const stamp = toUtcStamp(launch.lastUpdated ? new Date(launch.lastUpdated) : new Date())
  const sequence = launch.lastUpdated ? Math.floor(Date.parse(launch.lastUpdated) / 1000) : 1
  const url = `${trimSlash(baseUrl)}/launches/${launch.id}`
  const summary = icsEscape(`Liftoff: ${launch.name}`)
  const location = icsEscape([launch.padName, launch.padLocation].filter(Boolean).join(', '))
  const description = icsEscape(descriptionFor(launch, url))
  const status = calendarStatus(launch)
  const timing = timingLines(launch)
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `SEQUENCE:${Number.isFinite(sequence) ? sequence : 1}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `URL:${url}`,
    `STATUS:${status}`,
    ...timing,
  ]
  if (alarm && launch.net && !allDay(launch)) {
    lines.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Time to get set for liftoff', 'END:VALARM')
  }
  lines.push('END:VEVENT')
  return lines.map(foldLine).join('\r\n')
}

function descriptionFor(launch: Launch, url: string): string {
  const bits = [
    launch.missionDescription,
    launch.provider.name + ' · ' + launch.rocketName,
    launch.precision && /day|month|year/i.test(launch.precision)
      ? 'The clock is only set to the day. It will move.'
      : 'If the rocket slips, this event moves the next time your calendar refreshes the Liftoff Club feed.',
    url,
  ]
  return bits.filter(Boolean).join('\n')
}

function calendarStatus(launch: Launch): string {
  const status = `${launch.statusAbbrev} ${launch.statusName}`.toLowerCase()
  if (status.includes('fail')) return 'CANCELLED'
  if (status.includes('go') || status.includes('success') || status.includes('flight')) return 'CONFIRMED'
  return 'TENTATIVE'
}

function allDay(launch: Launch): boolean {
  return /day|month|year|quarter|week/i.test(launch.precision ?? '')
}

function timingLines(launch: Launch): string[] {
  if (!launch.net) {
    return ['DTSTART:' + toUtcStamp(new Date())]
  }
  if (allDay(launch)) {
    const start = compactDate(launch.net)
    const end = addDays(start, 1)
    return [`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`]
  }
  const startMs = Date.parse(launch.net)
  const windowEnd = launch.windowEnd ? Date.parse(launch.windowEnd) : NaN
  let endMs = startMs + 60 * 60 * 1000
  if (Number.isFinite(windowEnd) && windowEnd - startMs >= 10 * 60 * 1000 && windowEnd - startMs <= 4 * 60 * 60 * 1000) {
    endMs = windowEnd
  }
  return [`DTSTART:${toUtcStamp(new Date(startMs))}`, `DTEND:${toUtcStamp(new Date(endMs))}`]
}

export function googleCalendarUrl(launch: Launch, baseUrl: string): string {
  const text = encodeURIComponent(`Liftoff: ${launch.name}`)
  const details = encodeURIComponent(descriptionFor(launch, `${trimSlash(baseUrl)}/launches/${launch.id}`))
  const location = encodeURIComponent([launch.padName, launch.padLocation].filter(Boolean).join(', '))
  if (!launch.net) {
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`
  }
  if (allDay(launch)) {
    const start = compactDate(launch.net)
    const end = addDays(start, 1)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
  }
  const start = toUtcStamp(new Date(launch.net))
  const end = timingLines(launch).find((line) => line.startsWith('DTEND:'))?.slice('DTEND:'.length) ?? start
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
}

export function outlookCalendarUrl(launch: Launch, baseUrl: string): string {
  const subject = encodeURIComponent(`Liftoff: ${launch.name}`)
  const body = encodeURIComponent(descriptionFor(launch, `${trimSlash(baseUrl)}/launches/${launch.id}`).slice(0, 700))
  const location = encodeURIComponent([launch.padName, launch.padLocation].filter(Boolean).join(', '))
  const start = launch.net ? new Date(launch.net).toISOString() : ''
  const endLine = launch.net ? timingLines(launch).find((line) => line.startsWith('DTEND:')) : undefined
  const end = endLine && !endLine.includes('VALUE=DATE') ? fromUtcStamp(endLine.slice('DTEND:'.length)) : start
  return `https://outlook.live.com/calendar/0/action/compose?rru=addevent&startdt=${encodeURIComponent(start)}&enddt=${encodeURIComponent(end)}&subject=${subject}&body=${body}&location=${location}`
}

export function webcalFeedUrl(baseUrl: string): string {
  const url = new URL('/calendar/feed.ics', ensureProtocol(baseUrl))
  return `webcal://${url.host}${url.pathname}`
}

function ensureProtocol(baseUrl: string): string {
  if (/^https?:\/\//i.test(baseUrl)) return baseUrl
  return `https://${baseUrl}`
}

function trimSlash(value: string): string {
  return value.replace(/\/$/, '')
}

function compactDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '')
}

function addDays(compact: string, days: number): string {
  const year = Number(compact.slice(0, 4))
  const month = Number(compact.slice(4, 6))
  const day = Number(compact.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

export function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function fromUtcStamp(stamp: string): string {
  const match = stamp.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
  if (!match) return stamp
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
}

export function icsEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/** Fold a content line at 75 octets, as RFC 5545 requires. */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let start = 0
  let limit = 75
  while (start < bytes.length) {
    let end = Math.min(bytes.length, start + limit)
    while (end > start && (bytes[end] & 0xc0) === 0x80) end -= 1
    if (end === start) end = Math.min(bytes.length, start + limit)
    parts.push(bytes.subarray(start, end).toString('utf8'))
    start = end
    limit = 74
  }
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join('\r\n')
}
