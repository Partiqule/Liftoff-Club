import { after } from 'next/server'
import { getSkyCatalog, refreshSkyCatalog } from '@/lib/sky-catalog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const catalog = await getSkyCatalog()
  if (catalog.objects.length === 0) after(() => refreshSkyCatalog())
  return Response.json(catalog)
}
