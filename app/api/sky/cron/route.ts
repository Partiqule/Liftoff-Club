import { cronAuthorized } from '@/lib/push/config'
import { refreshSkyCatalog } from '@/lib/sky-catalog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get('authorization'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await refreshSkyCatalog()
  return Response.json(result)
}
