import type { Launch } from '@/lib/types'

/** Fields the home page needs in the browser. The rest of the listing stays on the server. */
export type HomeCard = {
  id: string
  name: string
  provider: { name: string }
  rocketName: string
  missionName: string | null
  missionType: string | null
  orbitName: string | null
  orbitAbbrev: string | null
  padName: string
  padLocation: string | null
  padLat: number | null
  padLon: number | null
  net: string | null
  /** Coarse listings stay a date. Without this, the home card would invent a clock. */
  precision: string | null
  statusName: string
  statusAbbrev: string
  featured: boolean
  historical?: boolean
}

export function toHomeCard(launch: Launch): HomeCard {
  return {
    id: launch.id,
    name: launch.name,
    provider: { name: launch.provider.name },
    rocketName: launch.rocketName,
    missionName: launch.missionName,
    missionType: launch.missionType,
    orbitName: launch.orbitName,
    orbitAbbrev: launch.orbitAbbrev,
    padName: launch.padName,
    padLocation: launch.padLocation,
    padLat: launch.padLat,
    padLon: launch.padLon,
    net: launch.net,
    precision: launch.precision,
    statusName: launch.statusName,
    statusAbbrev: launch.statusAbbrev,
    featured: launch.featured,
    historical: launch.historical,
  }
}
