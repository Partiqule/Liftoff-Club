import { getLaunch, getLaunches } from '@/lib/launches'
import { cronAuthorized, pushConfigured } from '@/lib/push/config'
import { applyNotices, planNotices, type LaunchSnap } from '@/lib/push/plan'
import { isQuietHour } from '@/lib/quiet'
import { listPushes, removePush, replacePush } from '@/lib/push/redis'
import { sendNotice } from '@/lib/push/send'
import type { Launch } from '@/lib/types'

export const maxDuration = 60

function snap(launch: Launch): LaunchSnap {
  return { id: launch.id, name: launch.name, net: launch.net, precision: launch.precision, statusName: launch.statusName }
}

export async function GET(request: Request) {
  if (!pushConfigured()) return Response.json({ ok: true, skipped: 'push not configured' })
  if (!cronAuthorized(request.headers.get('authorization'))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const board = await getLaunches()
  const byId = new Map(board.launches.map((launch) => [launch.id, snap(launch)]))
  const records = await listPushes()
  let sent = 0
  let removed = 0
  const extraBudget = { left: 8 }
  for (const record of records) {
    const launches: LaunchSnap[] = []
    for (const id of record.launchIds) {
      const known = byId.get(id)
      if (known) {
        launches.push(known)
        continue
      }
      if (extraBudget.left <= 0) continue
      extraBudget.left -= 1
      const launch = await getLaunch(id)
      if (launch) launches.push(snap(launch))
    }
    const notices = planNotices(Date.now(), record, launches)
    let gone = false
    for (const notice of notices) {
      const result = await sendNotice(record, notice)
      if (result === 'gone') {
        gone = true
        break
      }
      if (result === 'sent') sent += 1
    }
    if (gone) {
      await removePush(record.id)
      removed += 1
      continue
    }
    const quiet = isQuietHour(new Date(), record.quietStart, record.quietEnd, record.timezone)
    if (!record.paused && !quiet) await replacePush({ ...record, ...applyNotices(record, notices, launches) })
  }
  return Response.json({ ok: true, checked: records.length, sent, removed })
}
