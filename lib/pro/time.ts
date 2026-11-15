export const MOUNTAIN = 'America/Denver'

export function formatMountain(iso: string | null | undefined): string {
  if (!iso) return 'Time not set'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Time not set'
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: MOUNTAIN,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
  return `${formatted} MT`
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
