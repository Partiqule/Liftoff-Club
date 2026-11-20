import { getSkyCatalog } from '@/lib/sky-catalog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const catalog = await getSkyCatalog()
  return Response.json(catalog)
}
