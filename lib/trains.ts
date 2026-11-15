import type { SkyPass } from '@/lib/types'

const WINDOW_MS = 4 * 24 * 60 * 60 * 1000

export type TrainLaunch = {
  name: string
  net: string | null
  statusName: string
  launchDesignator: string | null
}

/** Starlink launches from the last few days that already flew. */
export function recentStarlinkDesignators(launches: TrainLaunch[], now = Date.now()): string[] {
  const found: string[] = []
  for (const launch of launches) {
    if (!launch.launchDesignator || !/starlink/i.test(launch.name)) continue
    if (!/success/i.test(launch.statusName)) continue
    const when = launch.net ? Date.parse(launch.net) : NaN
    if (!Number.isFinite(when) || when > now || now - when > WINDOW_MS) continue
    if (!found.includes(launch.launchDesignator)) found.push(launch.launchDesignator)
    if (found.length >= 3) break
  }
  return found
}

/** Dark sky, satellite in sunlight, and high enough to bother looking. Approximate. */
export function isVisibleTrain(pass: Pick<SkyPass, 'kind' | 'illuminatedAtPeak' | 'sunElevationAtPeak' | 'maxElevation' | 'grade'>): boolean {
  return pass.kind === 'starlink' && pass.illuminatedAtPeak && pass.sunElevationAtPeak <= -6 && pass.maxElevation >= 25 && pass.grade !== 'poor'
}
