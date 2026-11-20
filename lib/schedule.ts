import type { Launch } from '@/lib/types'

export function isHistorical(launch: { historical?: boolean }): boolean {
  return launch.historical === true
}

/** A clock that has not ended. History rows and past nets are not ahead. */
export function clockIsFuture(launch: { net: string | null; windowEnd?: string | null }, now = Date.now()): boolean {
  const raw = launch.windowEnd || launch.net
  if (!raw) return false
  const when = Date.parse(raw)
  return Number.isFinite(when) && when > now - 30 * 60 * 1000
}

export function isStillAhead(launch: Launch, now = Date.now()): boolean {
  if (isHistorical(launch)) return false
  const status = `${launch.statusAbbrev} ${launch.statusName}`.toLowerCase()
  if (status.includes('fail')) return false
  if (status.includes('success')) return false
  if (!launch.net && !launch.windowEnd) return true
  return clockIsFuture(launch, now)
}

/** The soonest launch that is still in the future. Past and history rows never qualify. */
export function pickNext<T extends { net: string | null; windowEnd?: string | null; historical?: boolean }>(
  launches: T[],
  now = Date.now(),
  prefer?: (item: T) => boolean,
): T | null {
  const future = launches.filter((item) => !isHistorical(item) && clockIsFuture(item, now))
  const pool = prefer ? future.filter(prefer) : future
  pool.sort((a, b) => Date.parse(a.net || a.windowEnd || '') - Date.parse(b.net || b.windowEnd || ''))
  return pool[0] ?? null
}

export function sortLaunches(launches: Launch[]): Launch[] {
  return launches.slice().sort((a, b) => {
    if (!a.net && !b.net) return a.name.localeCompare(b.name)
    if (!a.net) return 1
    if (!b.net) return -1
    return Date.parse(a.net) - Date.parse(b.net)
  })
}

export function isCrewLaunch(launch: Launch): boolean {
  const text = `${launch.missionType ?? ''} ${launch.name} ${launch.spacecraftName ?? ''}`
  return /crew|tourism|human/i.test(text)
}

export type LaunchFilter = {
  who?: string
  when?: string
  /** `starbase` matches Starbase or Boca Chica. Any other value is matched against the pad text. */
  site?: string
}

export function filterLaunches(launches: Launch[], filter: LaunchFilter, now = Date.now()): Launch[] {
  return launches.filter((launch) => {
    if (filter.who === 'spacex' && !launch.featured) return false
    if (filter.site) {
      const where = `${launch.padName} ${launch.padLocation ?? ''} ${launch.name}`.toLowerCase()
      if (filter.site === 'starbase') {
        if (!/starbase|boca chica/.test(where)) return false
      } else if (!where.includes(filter.site.toLowerCase())) return false
    }
    if (filter.who === 'crew' && !isCrewLaunch(launch)) return false
    if (filter.when === 'week') {
      if (!launch.net) return false
      const net = Date.parse(launch.net)
      if (!Number.isFinite(net)) return false
      if (net > now + 7 * 86_400_000) return false
      if (net < now - 6 * 60 * 60 * 1000) return false
    }
    return true
  })
}

const SHELL_HORIZON_MS = 8 * 86_400_000

/**
 * Launches the shell needs for tonight, the week brief, and reminders.
 * The full board stays on /launches. A flown row is not part of this list.
 */
export function briefsForShell(launches: Launch[], now = Date.now()): Launch[] {
  const ahead = launches.filter((launch) => isStillAhead(launch, now))
  const soon = ahead.filter((launch) => {
    if (!launch.net) return false
    const when = Date.parse(launch.net)
    return Number.isFinite(when) && when <= now + SHELL_HORIZON_MS
  })
  const next = pickNext(ahead, now)
  if (next && !soon.some((launch) => launch.id === next.id)) return [next, ...soon]
  return soon
}

export function toBrief(launch: Launch) {
  return {
    id: launch.id,
    name: launch.name,
    providerName: launch.provider.name,
    rocketName: launch.rocketName,
    missionType: launch.missionType,
    net: launch.net,
    windowStart: launch.windowStart,
    windowEnd: launch.windowEnd,
    precision: launch.precision,
    statusAbbrev: launch.statusAbbrev,
    statusName: launch.statusName,
    padName: launch.padName,
    padLocation: launch.padLocation,
    padLat: launch.padLat,
    padLon: launch.padLon,
    featured: launch.featured,
    historical: launch.historical === true,
  }
}
