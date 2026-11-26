'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { HomeGlobeFallback } from '@/components/home-globe-fallback'
import { NextLaunchCard } from '@/components/next-launch'
import { useAfterLoad } from '@/components/use-after-load'
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
