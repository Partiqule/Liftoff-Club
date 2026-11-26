import type { SkyJudgement } from '@/lib/types'

/**
 * Open-Meteo free API is not for commercial use.
 * A paid plan is required before Pro ever charges.
 */
import { hourKey } from '@/lib/time'

export type HourSky = {
  time: string
  cloud: number | null
  precip: number | null
  code: number | null
}

export type WeatherBundle = {
  hours: HourSky[]
  timezone: string
  fetchedAt: string
}

export function judgeSky(input: { cloud: number | null; precip: number | null; code: number | null }): SkyJudgement {
  if (input.cloud == null && input.code == null) {
    return {
      call: 'unknown',
      label: 'No forecast yet.',
      reason: 'The weather feed did not answer. The pass time is still worth knowing.',
      cloud: null,
    }
  }
  const cloud = input.cloud ?? 100
  const precip = input.precip ?? 0
  const code = input.code
  const fog = code === 45 || code === 48
  const falling = code != null && code >= 51
  if (fog || falling || precip >= 60 || cloud >= 85) {
    return {
      call: 'nogo',
      label: fog ? 'Fog is likely to hide it.' : 'Clouds are likely to hide it.',
      reason: fog
        ? 'Fog is in the forecast. A bright satellite will not show through it.'
        : 'Clouds or rain are likely to hide the sky.',
      cloud: input.cloud,
    }
  }
  if (cloud <= 35 && precip <= 25) {
    return {
      call: 'go',
      label: "Clear skies, it's a go.",
      reason: 'The sky looks clear enough to see it with your eyes.',
      cloud: input.cloud,
    }
  }
  return {
    call: 'maybe',
    label: 'Some cloud. You might still catch it.',
    reason: 'There may be a gap, or the sky may stay gray.',
    cloud: input.cloud,
  }
}

export function skyAt(bundle: WeatherBundle | null, iso: string): SkyJudgement {
  if (!bundle) {
    return judgeSky({ cloud: null, precip: null, code: null })
  }
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return judgeSky({ cloud: null, precip: null, code: null })
  const key = hourKey(when, bundle.timezone)
  const hour = bundle.hours.find((item) => item.time.startsWith(key))
  if (!hour) {
    const daysOut = (when.getTime() - Date.now()) / 86_400_000
    if (daysOut > 7) {
      return {
        call: 'unknown',
        label: 'Too early for a sky call.',
        reason: 'The forecast is only solid for about a week. Check again closer to the night.',
        cloud: null,
      }
    }
    return judgeSky({ cloud: null, precip: null, code: null })
  }
  return judgeSky(hour)
}

export async function fetchWeather(place: { lat: number; lon: number; timezone: string }): Promise<WeatherBundle | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', place.lat.toFixed(3))
  url.searchParams.set('longitude', place.lon.toFixed(3))
  url.searchParams.set('hourly', 'cloud_cover,precipitation_probability,weather_code')
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('timezone', place.timezone || 'auto')
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), next: { revalidate: 1800 } })
  if (!response.ok) return null
  const body = (await response.json()) as {
    timezone?: string
    hourly?: {
      time?: string[]
      cloud_cover?: Array<number | null>
      precipitation_probability?: Array<number | null>
      weather_code?: Array<number | null>
    }
  }
  const times = body.hourly?.time ?? []
  const hours: HourSky[] = times.map((time, index) => ({
    time,
    cloud: body.hourly?.cloud_cover?.[index] ?? null,
    precip: body.hourly?.precipitation_probability?.[index] ?? null,
    code: body.hourly?.weather_code?.[index] ?? null,
  }))
  return {
    hours,
    timezone: body.timezone || place.timezone,
    fetchedAt: new Date().toISOString(),
  }
}
