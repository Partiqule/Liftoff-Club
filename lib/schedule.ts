import type { Launch } from '@/lib/types'

export function isStillAhead(launch: Launch, now = Date.now()): boolean {
  const status = `${launch.statusAbbrev} ${launch.statusName}`.toLowerCase()
  if (status.includes('fail')) return false
  if (status.includes('success')) return false
  if (status.includes('flight')) return true
  if (!launch.net) return true
  const end = Date.parse(launch.windowEnd || launch.net)
  if (!Number.isFinite(end)) return true
  return end > now - 30 * 60 * 1000
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
}

export function filterLaunches(launches: Launch[], filter: LaunchFilter, now = Date.now()): Launch[] {
  return launches.filter((launch) => {
    if (filter.who === 'spacex' && !launch.featured) return false
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
  }
}
