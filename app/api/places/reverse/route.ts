import { labelForCoords } from '@/lib/places'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const lat = Number(params.get('lat'))
  const lon = Number(params.get('lon'))
  const timezone = (params.get('tz') ?? 'UTC').slice(0, 80)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return Response.json({ error: 'That point is not on the map.' }, { status: 400 })
  }
  const place = await labelForCoords(lat, lon, timezone)
  return Response.json(place, {
    headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  })
}
