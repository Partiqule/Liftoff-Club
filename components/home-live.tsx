'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FlightRadar } from '@/components/flight-radar'
import { NextLaunchCard } from '@/components/next-launch'
import { radarLaunchFrom } from '@/lib/radar'
import { HOME_COPY } from '@/lib/home-copy'
import { pickHomeLaunch } from '@/lib/schedule'
import type { Launch } from '@/lib/types'

export function HomeLive({ launches }: { launches: Launch[] }) {
  const now = useHomeNow()
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
  return (
    <>
      <NextLaunchCard launch={next} />
      <FlightRadar launch={radar} />
      <nav className="home-links wrap" aria-label="More on Liftoff Club">
        <Link href="/launches">{HOME_COPY.all}</Link>
        <Link href="/sky">{HOME_COPY.sky}</Link>
      </nav>
    </>
  )
}

function useHomeNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
