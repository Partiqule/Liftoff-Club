import { after } from 'next/server'
import { getSkyCatalog, refreshSkyCatalog } from '@/lib/sky-catalog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

let filling = false

export async function GET() {
  const catalog = await getSkyCatalog()
  const hasTrain = catalog.objects.some((object) => object.kind === 'starlink')
  if (!hasTrain && !filling) {
    filling = true
    after(() => refreshSkyCatalog())
  }
  return Response.json(catalog)
}
