import type { Launch } from '@/lib/types'

export const HOME_COPY = {
  kicker: 'Next launch',
  emptyTitle: 'Nothing posted yet',
  emptyLede: 'The board does not have an upcoming flight right now.',
  see: 'Can I see it from here?',
  guess: 'A family guess from distance and daylight. Not a promise.',
  all: 'All launches',
  sky: 'Sky tonight',
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
  if (pad && where && !where.toLowerCase().includes(pad.toLowerCase())) return `${pad}, ${where}`
  return where || pad || HOME_COPY.placeMissing
}
