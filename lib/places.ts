import type { Place } from '@/lib/types'

/** Home town for first paint, before a saved place or a tap on Use my location. */
export const CENTENNIAL: Place = {
  label: 'Centennial, Colorado',
  lat: 39.5807,
  lon: -104.8772,
  timezone: 'America/Denver',
  source: 'search',
}

export function watchingPlace(place: Place | null | undefined): Place {
  return place ?? CENTENNIAL
}

type GeoResult = {
  name?: string
  admin1?: string
  country?: string
  country_code?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', trimmed)
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  if (!response.ok) return []
  const body = (await response.json()) as { results?: GeoResult[] }
  return (body.results ?? [])
    .map((result) => toPlace(result, 'search'))
    .filter((place): place is Place => Boolean(place))
}

export async function labelForCoords(lat: number, lon: number, timezone: string): Promise<Place> {
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse')
    url.searchParams.set('latitude', lat.toFixed(3))
    url.searchParams.set('longitude', lon.toFixed(3))
    url.searchParams.set('language', 'en')
    url.searchParams.set('format', 'json')
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (response.ok) {
      const body = (await response.json()) as { results?: GeoResult[] } | GeoResult
      const result = Array.isArray((body as { results?: GeoResult[] }).results)
        ? (body as { results: GeoResult[] }).results[0]
        : (body as GeoResult)
      const place = result ? toPlace({ ...result, latitude: lat, longitude: lon, timezone }, 'browser') : null
      if (place) return place
    }
  } catch {
    // Coordinates still work without a town name.
  }
  return {
    label: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
    lat,
    lon,
    timezone,
    source: 'browser',
  }
}

function toPlace(result: GeoResult, source: Place['source']): Place | null {
  if (typeof result.latitude !== 'number' || typeof result.longitude !== 'number' || !result.name) return null
  const region = result.admin1 && result.admin1 !== result.name ? result.admin1 : null
  const country = result.country_code || result.country || null
  const label = [result.name, region, country].filter(Boolean).join(', ')
  return {
    label,
    lat: result.latitude,
    lon: result.longitude,
    timezone: result.timezone || 'UTC',
    source,
  }
}
