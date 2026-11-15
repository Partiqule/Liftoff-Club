import { feedToIcs } from '@/lib/calendar'
import { getLaunches } from '@/lib/launches'
import { FREE_LINE } from '@/lib/pro/access-gate'
import { constellationRefs } from '@/lib/pro/options'
import { readViewer } from '@/lib/pro/viewer'
import { launchesForTargets, targetsFromQuery } from '@/lib/pro/watch'
import { siteUrl } from '@/lib/site'

export async function GET(request: Request) {
  const viewer = await readViewer(request)
  if (viewer.level !== 'full') {
    const body = feedToIcs([], siteUrl(), Date.now(), {
      name: 'Liftoff Club Pro',
      description: `Preview only. ${FREE_LINE} Full desks open after approval.`,
    })
    return new Response(body, {
      status: 401,
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, no-store' },
    })
  }
  const targets = targetsFromQuery(new URL(request.url).searchParams.get('targets') ?? '')
  const board = await getLaunches()
  const launches = launchesForTargets(board.launches, targets, constellationRefs())
  const body = feedToIcs(launches, siteUrl(), Date.now(), {
    name: 'Liftoff Club Pro',
    description: 'Watched launches from Liftoff Club Pro. Times update when a launch slips.',
  })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="liftoff-club-pro.ics"',
      'Cache-Control': 'private, no-store',
    },
  })
}
