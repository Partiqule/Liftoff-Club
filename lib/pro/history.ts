import { mountainYear, utcDay } from '@/lib/pro/time'

export type HistoryLaunch = {
  id: string
  name: string
  missionName: string | null
  net: string | null
  statusName: string
  statusAbbrev: string
}

/** Public listing names used to recognize a constellation on a past flight. */
export const HISTORY_PATTERNS: Record<string, string> = {
  starlink: 'starlink group',
  kuiper: 'amazon leo|kuiper',
  oneweb: 'oneweb',
  iridium: 'iridium',
}

export const HISTORY_SEARCHES: Record<string, string[]> = {
  starlink: ['Starlink Group'],
  kuiper: ['Kuiper', 'Amazon Leo'],
  oneweb: ['OneWeb'],
  iridium: ['Iridium'],
}

export const CATALOG_LAG_NOTE = 'Latest launch not yet in the satellite catalog'

export function readHistoryLaunch(value: unknown): HistoryLaunch | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const id = typeof item.id === 'string' ? item.id : ''
  const name = typeof item.name === 'string' ? item.name : ''
  if (!id || !name) return null
  const status = item.status && typeof item.status === 'object' ? (item.status as Record<string, unknown>) : null
  const mission = item.mission && typeof item.mission === 'object' ? (item.mission as Record<string, unknown>) : null
  return {
    id,
    name,
    missionName: typeof mission?.name === 'string' ? mission.name : null,
    net: typeof item.net === 'string' ? item.net : null,
    statusName: typeof status?.name === 'string' ? status.name : 'Unknown',
    statusAbbrev: typeof status?.abbrev === 'string' ? status.abbrev : 'Unknown',
  }
}

export function isFlownSuccess(launch: HistoryLaunch): boolean {
  const text = `${launch.statusAbbrev} ${launch.statusName}`.toLowerCase()
  if (/fail|scrub|\bhold\b|tbd|partial/.test(text)) return false
  return /success/.test(text)
}

export function historyMatches(pattern: string, launch: HistoryLaunch): boolean {
  try {
    return new RegExp(pattern, 'i').test(`${launch.name} ${launch.missionName ?? ''}`)
  } catch {
    return false
  }
}

export type HistorySummary = {
  launchesThisYear: number
  last: HistoryLaunch | null
}

export function summarizeHistory(pattern: string, launches: HistoryLaunch[], year: number): HistorySummary {
  const flown = launches.filter((launch) => historyMatches(pattern, launch) && isFlownSuccess(launch) && launch.net)
  const last = flown.slice().sort((a, b) => Date.parse(b.net ?? '') - Date.parse(a.net ?? ''))[0] ?? null
  const launchesThisYear = flown.filter((launch) => mountainYear(launch.net ?? '') === year).length
  return { launchesThisYear, last }
}

/** True when Launch Library shows a flight on a later day than the satellite catalog. */
export function catalogIsBehind(lastNet: string | null | undefined, catalogDay: string | null | undefined): boolean {
  if (!lastNet || !catalogDay || !/^\d{4}-\d{2}-\d{2}$/.test(catalogDay)) return false
  const day = utcDay(lastNet)
  return Boolean(day && day > catalogDay)
}
