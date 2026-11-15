import { isStillAhead, sortLaunches } from '@/lib/schedule'
import type { Launch } from '@/lib/types'

export const SCHEDULE_KEY = 'liftoff-ios-schedule-v1'
export const SCHEDULE_LIMIT = 8

export type IosLaunch = {
  id: string
  name: string
  net: string | null
  whenLabel: string
  rocket: string
  provider: string
  pad: string
  status: string
  url: string
}

export type IosSchedule = {
  fetchedAt: string
  launches: IosLaunch[]
}

/** The next public flights only. A missing clock stays null. */
export function iosSchedule(launches: Launch[], origin: string, now = new Date()): IosSchedule {
  const ahead = sortLaunches(launches.filter((launch) => isStillAhead(launch, now.getTime()))).slice(0, SCHEDULE_LIMIT)
  return {
    fetchedAt: now.toISOString(),
    launches: ahead.map((launch) => ({
      id: launch.id,
      name: launch.name,
      net: launch.net,
      whenLabel: whenLabel(launch.net),
      rocket: launch.rocketName,
      provider: launch.provider.name,
      pad: launch.padName,
      status: launch.statusName,
      url: `${origin.replace(/\/$/, '')}/launches/${launch.id}`,
    })),
  }
}

export function readStoredSchedule(raw: string | null): IosSchedule | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as IosSchedule
    if (!parsed || !Array.isArray(parsed.launches)) return null
    const launches = parsed.launches
      .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
      .slice(0, SCHEDULE_LIMIT)
      .map((item) => ({
        id: item.id,
        name: item.name,
        net: typeof item.net === 'string' ? item.net : null,
        whenLabel: typeof item.whenLabel === 'string' ? item.whenLabel : whenLabel(typeof item.net === 'string' ? item.net : null),
        rocket: typeof item.rocket === 'string' ? item.rocket : '',
        provider: typeof item.provider === 'string' ? item.provider : '',
        pad: typeof item.pad === 'string' ? item.pad : '',
        status: typeof item.status === 'string' ? item.status : '',
        url: typeof item.url === 'string' && item.url.startsWith('https://') ? item.url : 'https://liftoffclub.app/',
      }))
    return { fetchedAt: typeof parsed.fetchedAt === 'string' ? parsed.fetchedAt : '', launches }
  } catch {
    return null
  }
}

export function whenLabel(net: string | null): string {
  if (!net) return 'Clock not set'
  const date = new Date(net)
  if (Number.isNaN(date.getTime())) return 'Clock not set'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}
