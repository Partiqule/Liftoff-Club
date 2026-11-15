import { launchToIcs } from '@/lib/calendar'
import { getLaunch } from '@/lib/launches'
import { siteUrl } from '@/lib/site'

export const revalidate = 1800

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const launch = await getLaunch(id)
  if (!launch) return new Response('Launch not found', { status: 404 })
  const body = launchToIcs(launch, siteUrl(), { alarm: true })
  const filename = `liftoff-${launch.id}.ics`
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=600, s-maxage=1800',
    },
  })
}
