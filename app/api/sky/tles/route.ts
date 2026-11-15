import { getTles } from '@/lib/tle'

export const dynamic = 'force-dynamic'

export async function GET() {
  const bundle = await getTles()
  return Response.json({
    iss: { name: bundle.iss.name, line1: bundle.iss.line1, line2: bundle.iss.line2 },
    starlink: bundle.starlink.map((sat) => ({ name: sat.name, line1: sat.line1, line2: sat.line2 })),
    fetchedAt: bundle.fetchedAt,
    source: bundle.source,
    notice: bundle.notice,
  })
}
