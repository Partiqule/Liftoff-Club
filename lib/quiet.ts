/** True when local clock is inside bedtime, including ranges that cross midnight. */
export function isQuietHour(date: Date, start: string, end: string, timeZone?: string): boolean {
  const minutes = minutesInZone(date, timeZone)
  const startMin = parseClock(start)
  const endMin = parseClock(end)
  if (startMin == null || endMin == null || startMin === endMin) return false
  if (startMin < endMin) return minutes >= startMin && minutes < endMin
  return minutes >= startMin || minutes < endMin
}

function parseClock(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function minutesInZone(date: Date, timeZone?: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
    return hour * 60 + minute
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes()
  }
}
