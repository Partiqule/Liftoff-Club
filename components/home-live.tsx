'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { FlightStrip } from '@/components/flight-strip'
import { HomeGlobeFallback } from '@/components/home-globe-fallback'
import { useAfterLoad } from '@/components/use-after-load'
import type { HomeCard } from '@/lib/home-card'
import { homePhase, pickHomeLaunch } from '@/lib/schedule'

const HomeGlobe = dynamic(() => import('@/components/home-globe').then((mod) => mod.HomeGlobe), {
  ssr: false,
  loading: () => <HomeGlobeFallback />,
})

export function HomeLive({
  launches,
  middle,
  note,
  footer,
}: {
  launches: HomeCard[]
  middle: ReactNode
  note: ReactNode
  footer: ReactNode
}) {
  const now = useHomeNow()
  const globeReady = useAfterLoad()
  const featured = pickHomeLaunch(launches, now, (launch) => launch.featured)
  const rest = launches.filter((launch) => homePhase(launch, now) !== 'flown' && launch.id !== featured?.id).slice(0, 6)
  return (
    <>
      {globeReady ? <HomeGlobe launches={launches} now={now} /> : <HomeGlobeFallback />}
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
