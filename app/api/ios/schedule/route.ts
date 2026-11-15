import { iosSchedule } from '@/lib/ios/schedule'
import { getLaunches } from '@/lib/launches'
import { siteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function GET() {
  const board = await getLaunches()
  const schedule = iosSchedule(board.launches, siteUrl())
  return Response.json(schedule, {
    headers: { 'Cache-Control': 'public, max-age=600' },
  })
}
