import type { Launch } from '@/lib/types'

/**
 * A label only when the public listing itself says test, demonstration, or suborbital.
 * A Starship flight number is the public name of that flight-test series.
 */
export function flightKind(
  launch: Pick<Launch, 'name' | 'missionName' | 'missionType' | 'orbitName' | 'orbitAbbrev'>,
): string | null {
  const orbit = `${launch.orbitName ?? ''} ${launch.orbitAbbrev ?? ''}`
  const named = `${launch.missionType ?? ''} ${launch.missionName ?? ''} ${launch.name}`
  const suborbital = /suborbital/i.test(orbit) || /suborbital/i.test(named)
  const test = /test flight|flight test|abort test|integrated flight test|\bift[-\s]?\d+/i.test(named) || /starship flight\s+\d+/i.test(named)
  const demo = /\bdemo\b|\bdemonstration\b/i.test(named)
  if (suborbital && (test || demo)) return 'Suborbital test flight'
  if (suborbital) return 'Suborbital'
  if (test) return 'Test flight'
  if (demo) return 'Demonstration'
  return null
}

export function listsStarbase(launch: Pick<Launch, 'name' | 'padName' | 'padLocation'>): boolean {
  return /starbase|boca chica/i.test(`${launch.padName} ${launch.padLocation ?? ''} ${launch.name}`)
}
