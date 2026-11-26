'use client'

import { useEffect } from 'react'
import type { SkyPass } from '@/lib/types'
import type { WeatherBundle } from '@/lib/weather'

type TleBody = {
  iss?: { name: string; line1: string; line2: string }
  starlink?: Array<{ name: string; line1: string; line2: string }>
  notice?: string | null
}

/**
 * Pass math and the weather request. Loaded only after a town is saved,
 * so the first visit does not download orbit code.
 */
export function SkyCalc({
  lat,
  lon,
  timezone,
  onPasses,
  onWeather,
  onNotice,
  onState,
}: {
  lat: number
  lon: number
  timezone: string
  onPasses: (passes: SkyPass[]) => void
  onWeather: (weather: WeatherBundle | null) => void
  onNotice: (notice: string | null) => void
  onState: (state: 'loading' | 'ready' | 'error') => void
}) {
  useEffect(() => {
    let cancel = false
    const place = { lat, lon, timezone }
    const timer = window.setTimeout(() => {
      if (!cancel) onState('loading')
    }, 0)
    const weatherPromise = fetch(
      `/api/sky/weather?lat=${encodeURIComponent(lat.toFixed(3))}&lon=${encodeURIComponent(lon.toFixed(3))}&tz=${encodeURIComponent(timezone)}`,
      { signal: AbortSignal.timeout(12_000) },
    )
      .then(async (response) => (response.ok ? ((await response.json()) as WeatherBundle | null) : null))
      .catch(() => null)
    ;(async () => {
      try {
        const [tleResponse, predictMod, sky] = await Promise.all([
          fetch('/api/sky/tles', { signal: AbortSignal.timeout(12_000) }).then((response) => {
            if (!response.ok) throw new Error('orbits')
            return response.json() as Promise<TleBody>
          }),
          import('@/lib/predict'),
          weatherPromise,
        ])
        if (cancel) return
        const now = new Date()
        const issEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000)
        const starEnd = new Date(now.getTime() + 20 * 60 * 60 * 1000)
        const jobs: Array<Promise<SkyPass[]>> = []
        if (tleResponse.iss?.line1 && tleResponse.iss.line2) {
          jobs.push(predictMod.predictPassesYielding([{ ...tleResponse.iss, kind: 'iss' }], place, now, issEnd))
        }
        const starlink = (tleResponse.starlink ?? [])
          .filter((sat) => sat.line1 && sat.line2)
          .map((sat) => ({ ...sat, kind: 'starlink' as const }))
        if (starlink.length > 0) {
          jobs.push(predictMod.predictPassesYielding(starlink, place, now, starEnd))
        }
        const found = (await Promise.all(jobs)).flat()
        if (cancel) return
        onPasses(found)
        onWeather(sky)
        onNotice(tleResponse.notice ?? null)
        onState('ready')
      } catch {
        if (!cancel) onState('error')
      }
    })()
    return () => {
      cancel = true
      window.clearTimeout(timer)
    }
  }, [lat, lon, timezone, onPasses, onWeather, onNotice, onState])

  return null
}
