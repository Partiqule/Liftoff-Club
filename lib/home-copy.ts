import type { Launch } from '@/lib/types'

export const HOME_COPY = {
  kicker: 'Next launch',
  emptyTitle: 'Nothing posted yet',
  emptyLede: 'No upcoming flight is posted right now.',
  see: 'Can I see it from here?',
  guess: 'A family guess from distance and daylight. Not a promise.',
  placeMissing: 'Place not posted',
} as const

export function rocketTitle(launch: Pick<Launch, 'rocketName' | 'name'>): string {
  const rocket = launch.rocketName.trim()
  return rocket || launch.name.trim() || HOME_COPY.kicker
}

export function missionTitle(launch: Pick<Launch, 'rocketName' | 'name' | 'missionName'>): string | null {
  const rocket = launch.rocketName.trim().toLowerCase()
  const mission = launch.missionName?.trim() ?? ''
  if (mission && mission.toLowerCase() !== rocket) return mission
  const name = launch.name.trim()
  if (name.includes('|')) {
    const rest = name.split('|').slice(1).join('|').trim()
    if (rest && rest.toLowerCase() !== rocket) return rest
  }
  if (name && name.toLowerCase() !== rocket) return name
  return null
}

export function placeLine(launch: Pick<Launch, 'padName' | 'padLocation'>): string {
  const pad = launch.padName.trim()
  const where = launch.padLocation?.trim() ?? ''
  if (!pad) return where || HOME_COPY.placeMissing
  if (!where) return pad
  const padKey = pad.toLowerCase()
  const whereKey = where.toLowerCase()
  if (whereKey.includes(padKey)) return where
  const parts = where.split(',').map((part) => part.trim()).filter(Boolean)
  const first = parts[0]?.toLowerCase() ?? ''
  if (first && (padKey.startsWith(first) || first.startsWith(padKey))) {
    const rest = parts.slice(1).join(', ')
    return rest ? `${pad}, ${rest}` : pad
  }
  return `${pad}, ${where}`
}
