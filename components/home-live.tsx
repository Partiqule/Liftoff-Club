'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { FlightRadar } from '@/components/flight-radar'
import { FlightStrip } from '@/components/flight-strip'
import { radarLaunchFrom } from '@/lib/radar'
import { homePhase, pickHomeLaunch } from '@/lib/schedule'
import type { Launch } from '@/lib/types'

export function HomeLive({
  launches,
  middle,
  note,
  footer,
}: {
  launches: Launch[]
  middle: ReactNode
  note: ReactNode
  footer: ReactNode
}) {
  const now = useHomeNow()
  const next = pickHomeLaunch(launches, now)
  const featured = pickHomeLaunch(launches, now, (launch) => launch.featured)
  const rest = launches.filter((launch) => homePhase(launch, now) !== 'flown' && launch.id !== featured?.id).slice(0, 6)
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
      <FlightRadar launch={radar} />
      {middle}
      <div className="wrap page" style={{ paddingTop: 0 }}>
        {note}
        <section>
          <div className="section-head">
            <h2>Next SpaceX</h2>
            <Link href="/launches?who=spacex">SpaceX only</Link>
          </div>
          {featured ? (
            <FlightStrip launch={featured} featured />
          ) : (
            <p className="note">
              Next launch not posted yet. <Link href="/launches">See the full schedule</Link>
            </p>
          )}
        </section>
        <section>
          <div className="section-head">
            <h2>Also on the board</h2>
            <Link href="/launches">The whole board</Link>
          </div>
          {rest.length === 0 ? <p className="note">The board is empty right now. The feed may be resting.</p> : null}
          <ul className="board">
            {rest.map((launch) => (
              <li key={launch.id}>
                <FlightStrip launch={launch} />
              </li>
            ))}
          </ul>
        </section>
        {footer}
      </div>
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
