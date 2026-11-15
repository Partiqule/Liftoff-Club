import { feedToIcs } from '@/lib/calendar'
import { getLaunches } from '@/lib/launches'
import { siteUrl } from '@/lib/site'

export const revalidate = 1800

export async function GET() {
  const board = await getLaunches()
  const body = feedToIcs(board.launches, siteUrl())
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="liftoff-club.ics"',
      'Cache-Control': 'public, max-age=600, s-maxage=1800',
    },
  })
}
