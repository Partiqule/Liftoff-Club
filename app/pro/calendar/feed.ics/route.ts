import { feedToIcs } from '@/lib/calendar'
import { getLaunches } from '@/lib/launches'
import { constellationRefs } from '@/lib/pro/options'
import { launchesForTargets, targetsFromQuery } from '@/lib/pro/watch'
import { siteUrl } from '@/lib/site'

export const revalidate = 1800

export async function GET(request: Request) {
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
      'Cache-Control': 'public, max-age=600, s-maxage=1800',
    },
  })
}
