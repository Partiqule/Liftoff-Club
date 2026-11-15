const RAD = Math.PI / 180
const EARTH_KM = 6371

export type LatLon = { lat: number; lon: number }

export function haversineKm(from: LatLon, to: LatLon): number {
  const lat1 = from.lat * RAD
  const lat2 = to.lat * RAD
  const dLat = (to.lat - from.lat) * RAD
  const dLon = (to.lon - from.lon) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function kmToMiles(km: number): number {
  return km * 0.621371
}

/** Initial compass bearing in degrees, 0 north, 90 east. */
export function initialBearingDeg(from: LatLon, to: LatLon): number {
  const lat1 = from.lat * RAD
  const lat2 = to.lat * RAD
  const dLon = (to.lon - from.lon) * RAD
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) / RAD + 360) % 360
}

const EIGHT = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'] as const

export function compass8(azimuthDeg: number): string {
  const wrapped = ((azimuthDeg % 360) + 360) % 360
  const index = Math.round(wrapped / 45) % 8
  return EIGHT[index] ?? 'north'
}

export function formatMiles(miles: number): string {
  if (!Number.isFinite(miles)) return ''
  if (miles < 10) return miles.toFixed(1)
  return Math.round(miles).toLocaleString('en-US')
}

export function heightPhrase(elevationDeg: number): string {
  if (elevationDeg < 15) return 'just over the rooftops'
  if (elevationDeg < 30) return 'low in the sky'
  if (elevationDeg < 50) return 'about halfway up'
  if (elevationDeg < 70) return 'high overhead'
  return 'almost straight up'
}
