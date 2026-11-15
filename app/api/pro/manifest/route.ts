import { getLaunches } from '@/lib/launches'
import { manifestCsv } from '@/lib/pro/manifest-intel'
import { readViewer } from '@/lib/pro/viewer'

export async function GET(request: Request) {
  const viewer = await readViewer(request)
  if (viewer.level !== 'full') {
    return Response.json({ error: 'Full Pro opens after approval. Free during early access.' }, { status: 401 })
  }
  const board = await getLaunches()
  return new Response(manifestCsv(board.launches), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="liftoff-club-pro-manifest.csv"',
      'Cache-Control': 'private, no-store',
    },
  })
}
