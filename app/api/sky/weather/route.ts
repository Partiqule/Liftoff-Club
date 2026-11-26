import { fetchWeather } from '@/lib/weather'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const lat = Number(params.get('lat'))
  const lon = Number(params.get('lon'))
  const timezone = (params.get('tz') ?? 'auto').slice(0, 80)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return Response.json(null, { status: 400 })
  }
  const bundle = await fetchWeather({ lat, lon, timezone })
  return Response.json(bundle, {
    headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400' },
  })
}
