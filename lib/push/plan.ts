import { formatLaunchWhen } from '@/lib/pro/time'
import { isQuietHour } from '@/lib/quiet'

/**
 * The one hour alert is due from 75 minutes before liftoff until 45 minutes before.
 * A GitHub schedule every 10 minutes, plus a few minutes of lag, still lands once.
 * Redis remembers the mark so a second check in the window does not send again.
 */
export const HOUR_EARLY_MS = 75 * 60 * 1000
export const HOUR_LATE_MS = 45 * 60 * 1000
/** Liftoff is due from 12 minutes before until 15 minutes after. */
export const LIFTOFF_EARLY_MS = 12 * 60 * 1000
export const LIFTOFF_LATE_MS = 15 * 60 * 1000

export type LaunchSnap = {
  id: string
  name: string
  net: string | null
  precision: string | null
  statusName?: string | null
}

export type PushRecord = {
  launchIds: string[]
  nets: Record<string, string | null>
  sent: Record<string, string[]>
  quietStart: string
  quietEnd: string
  timezone: string
  paused: boolean
}

export type PushNotice = {
  launchId: string
  kind: 'hour' | 'liftoff' | 'moved'
  title: string
  body: string
  url: string
  tag: string
  mark: string
  net: string | null
}

function clockIsSet(launch: LaunchSnap): boolean {
  if (!launch.net) return false
  const coarse = `${launch.precision ?? ''} ${launch.statusName ?? ''}`.toLowerCase()
  if (/month|quarter|year/.test(coarse)) return false
  if (/tbd|to be determined/.test(coarse) && /00:00:00/.test(launch.net)) return false
  return true
}

function already(record: PushRecord, launchId: string, mark: string): boolean {
  return (record.sent[launchId] ?? []).includes(mark)
}

export function planNotices(now: number, record: PushRecord, launches: LaunchSnap[]): PushNotice[] {
  if (record.paused) return []
  if (isQuietHour(new Date(now), record.quietStart, record.quietEnd, record.timezone)) return []
  const wanted = new Set(record.launchIds)
  const notices: PushNotice[] = []
  for (const launch of launches) {
    if (!wanted.has(launch.id)) continue
    const when = formatLaunchWhen(launch.net, launch.precision, launch.statusName)
    const previous = record.nets[launch.id]
    if (previous && launch.net && previous !== launch.net && !already(record, launch.id, `moved:${launch.net}`)) {
      notices.push(notice(launch, 'moved', `New time: ${launch.name}`, `${when}. The public clock moved.`, `moved:${launch.net}`))
    }
    if (!clockIsSet(launch) || !launch.net) continue
    const delta = Date.parse(launch.net) - now
    if (!Number.isFinite(delta)) continue
    if (delta >= HOUR_LATE_MS && delta <= HOUR_EARLY_MS && !already(record, launch.id, `hour:${launch.net}`)) {
      notices.push(notice(launch, 'hour', `One hour: ${launch.name}`, `${when}. About an hour to go.`, `hour:${launch.net}`))
    }
    if (delta <= LIFTOFF_EARLY_MS && delta >= -LIFTOFF_LATE_MS && !already(record, launch.id, `liftoff:${launch.net}`)) {
      notices.push(notice(launch, 'liftoff', `Liftoff: ${launch.name}`, `${when}.`, `liftoff:${launch.net}`))
    }
  }
  return notices
}

function notice(launch: LaunchSnap, kind: PushNotice['kind'], title: string, body: string, mark: string): PushNotice {
  return {
    launchId: launch.id,
    kind,
    title,
    body,
    url: `/launches/${launch.id}/day`,
    tag: `${kind}:${launch.id}`,
    mark,
    net: launch.net,
  }
}

export function applyNotices(record: PushRecord, notices: PushNotice[], launches: LaunchSnap[]): PushRecord {
  const nets = { ...record.nets }
  const sent = { ...record.sent }
  for (const launch of launches) {
    if (record.launchIds.includes(launch.id)) nets[launch.id] = launch.net
  }
  for (const item of notices) {
    const marks = new Set(sent[item.launchId] ?? [])
    marks.add(item.mark)
    sent[item.launchId] = [...marks]
  }
  return { ...record, nets, sent }
}
