import type { Launch } from '@/lib/types'

/** Starship and Falcon Heavy stay on the board even when a short preview is shown. */
export function isStarshipOrHeavy(launch: Pick<Launch, 'name' | 'rocketName'>): boolean {
  return /starship|falcon heavy/i.test(`${launch.name} ${launch.rocketName}`)
}

export function manifestBoard(launches: Launch[], preview: boolean, previewCount = 3): Launch[] {
  if (!preview) return launches
  const head = launches.slice(0, previewCount)
  const seen = new Set(head.map((launch) => launch.id))
  const kept = launches.filter((launch) => isStarshipOrHeavy(launch) && !seen.has(launch.id))
  return [...head, ...kept]
}

export function missingHeavy(source: Launch[], shown: Launch[]): string[] {
  const ids = new Set(shown.map((launch) => launch.id))
  return source.filter((launch) => isStarshipOrHeavy(launch) && !ids.has(launch.id)).map((launch) => launch.id)
}
