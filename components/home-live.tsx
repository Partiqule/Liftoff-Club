'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HomeGlobeFallback } from '@/components/home-globe-fallback'
import { NextLaunchCard } from '@/components/next-launch'
import { useAfterLoad } from '@/components/use-after-load'
import { HOME_COPY } from '@/lib/home-copy'
import type { HomeCard } from '@/lib/home-card'
import { pickHomeLaunch } from '@/lib/schedule'

const HomeGlobe = dynamic(() => import('@/components/home-globe').then((mod) => mod.HomeGlobe), {
  ssr: false,
  loading: () => <HomeGlobeFallback />,
})

export function HomeLive({ launches }: { launches: HomeCard[] }) {
  const now = useHomeNow()
  const globeReady = useAfterLoad()
  const next = pickHomeLaunch(launches, now)
  return (
    <>
      <NextLaunchCard launch={next} />
      {globeReady ? <HomeGlobe launches={launches} now={now} /> : <HomeGlobeFallback />}
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
