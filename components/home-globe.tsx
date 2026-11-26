'use client'

import { FlightRadar } from '@/components/flight-radar'
import type { HomeCard } from '@/lib/home-card'
import { radarLaunchFrom } from '@/lib/radar'
import { pickHomeLaunch } from '@/lib/schedule'

export function HomeGlobe({ launches, now }: { launches: HomeCard[]; now: number }) {
  const next = pickHomeLaunch(launches, now)
  const radar = radarLaunchFrom(
    next
      ? {
          name: next.name,
          rocketName: next.rocketName,
          padName: next.padName,
          padLat: next.padLat,
          padLon: next.padLon,
          orbitName: next.orbitName,
          orbitAbbrev: next.orbitAbbrev,
          net: next.net,
          statusAbbrev: next.statusAbbrev,
          statusName: next.statusName,
        }
      : null,
  )
  return <FlightRadar launch={radar} />
}
