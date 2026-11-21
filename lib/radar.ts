import { approximateInclination, groundTrack, launchAzimuthDeg } from '@/lib/mission'
import type { SkyElement, SkyKind } from '@/lib/sky-point'

/** Equirectangular NASA Blue Marble (Visible Earth land, ocean, ice), public domain. */
export const EARTH_TEXTURE = '/earth/blue-marble.jpg'
/** Full disk NASA Blue Marble photograph, public domain. Shown until the globe can draw. */
export const EARTH_STILL = '/earth/blue-marble-still.jpg'

export const RADAR_COPY = {
  kicker: 'In orbit now',
  legend: 'Stations, Hubble, bright satellites, and recent Starlink trains.',
  hint: 'Tap a dot for a name, altitude, speed, and the next orbit.',
  gesture: 'Drag to turn. Pinch or scroll to zoom.',
  stillAlt: 'Earth',
  liveLabel: 'Earth. Drag to turn. Pinch or scroll to zoom. Tap a satellite.',
  fallback: 'This screen keeps a still picture of Earth.',
  loading: 'Checking saved orbits.',
  empty: 'No saved orbits yet. The Earth is still here.',
  loadError: 'Saved orbits did not load. The Earth is still here.',
  altitude: 'Altitude',
  speed: 'Speed',
  orbit: 'The line is the next orbit.',
  close: 'Close',
  creditBefore: 'Earth image: NASA Blue Marble, public domain. Orbit data from',
  creditName: 'CelesTrak',
  you: 'You',
  pad: 'Launch pad',
  next: 'Next launch',
  path: 'The path leaves',
} as const

const CAPS: Record<SkyKind, number> = {
  station: 6,
  hubble: 2,
  starlink: 16,
  bright: 24,
}

const KIND_ORDER: SkyKind[] = ['station', 'hubble', 'starlink', 'bright']

export type RadarLaunch = {
  name: string
  padName: string
  padLat: number
  padLon: number
  track: { lat: number; lon: number }[]
}

export type RadarView = { yaw: number; pitch: number; distance: number }

export const RADAR_K = 2.7
export const RADAR_HOME_VIEW: RadarView = {
  yaw: (95 * Math.PI) / 180,
  pitch: (22 * Math.PI) / 180,
  distance: 2.95,
}

/** Put a latitude and longitude at the middle of the disc. */
export function viewLookingAt(lat: number, lon: number, distance = 2.8): RadarView {
  return {
    yaw: (-lon * Math.PI) / 180,
    pitch: (lat * Math.PI) / 180,
    distance,
  }
}

export function radarKindLabel(kind: SkyKind): string {
  if (kind === 'station') return 'Station'
  if (kind === 'hubble') return 'Hubble'
  if (kind === 'starlink') return 'Starlink'
  return 'Bright satellite'
}

export function formatAltitudeKm(km: number): string {
  if (!Number.isFinite(km)) return 'unknown'
  return `${Math.round(km)} km`
}

export function formatSpeedKms(kmPerSec: number): string {
  if (!Number.isFinite(kmPerSec)) return 'unknown'
  return `${kmPerSec.toFixed(2)} km/s`
}

/** No town and no chosen zone: do not print a repeated UTC label. */
export function observerDot(place: { lat: number; lon: number } | null | undefined): { lat: number; lon: number } | null {
  if (!place) return null
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return null
  if (place.lat < -90 || place.lat > 90 || place.lon < -180 || place.lon > 180) return null
  return { lat: place.lat, lon: place.lon }
}

export function capRadarObjects(objects: SkyElement[]): SkyElement[] {
  const seen = new Set<string>()
  const picked: SkyElement[] = []
  for (const kind of KIND_ORDER) {
    let count = 0
    for (const object of objects) {
      if (object.kind !== kind || count >= CAPS[kind]) continue
      if (!object.noradId || seen.has(object.noradId)) continue
      if (!object.line1.startsWith('1 ') || !object.line2.startsWith('2 ')) continue
      seen.add(object.noradId)
      count += 1
      picked.push(object)
    }
  }
  return picked
}

export function elementsFromTleBundle(body: {
  iss?: { name?: string; line1?: string; line2?: string } | null
  starlink?: Array<{ name?: string; line1?: string; line2?: string }> | null
}): SkyElement[] {
  const objects: SkyElement[] = []
  const add = (name: string, line1: string, line2: string, kind: SkyKind) => {
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) return
    objects.push({ noradId: line1.slice(2, 7).trim(), name, kind, line1, line2 })
  }
  if (body.iss?.line1 && body.iss.line2) add(body.iss.name?.trim() || 'ISS', body.iss.line1, body.iss.line2, 'station')
  for (const sat of body.starlink ?? []) {
    if (!sat.line1 || !sat.line2) continue
    add(sat.name?.trim() || 'Starlink', sat.line1, sat.line2, 'starlink')
  }
  return objects
}

export function radarLaunchFrom(
  launch: {
    name: string
    padName: string
    padLat: number | null
    padLon: number | null
    orbitName: string | null
    orbitAbbrev: string | null
  } | null,
): RadarLaunch | null {
  if (!launch || launch.padLat == null || launch.padLon == null) return null
  const inclination = approximateInclination(launch.orbitName, launch.orbitAbbrev, launch.padLat)
  const azimuth = launchAzimuthDeg(launch.padLat, inclination)
  if (azimuth == null) return null
  const track = groundTrack(launch.padLat, launch.padLon, azimuth)
  if (track.length < 2) return null
  return { name: launch.name, padName: launch.padName, padLat: launch.padLat, padLon: launch.padLon, track }
}

export function ascentProgress(nowMs: number, reduced: boolean, periodMs = 18000): number {
  if (reduced || periodMs <= 0) return 0
  const t = nowMs % periodMs
  return t / periodMs
}

type Vec3 = { x: number; y: number; z: number }

export function spherePoint(lat: number, lon: number): Vec3 {
  const λ = (lon * Math.PI) / 180
  const φ = (lat * Math.PI) / 180
  return { x: Math.cos(φ) * Math.sin(λ), y: Math.sin(φ), z: Math.cos(φ) * Math.cos(λ) }
}

export function rotY(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: c * p.x + s * p.z, y: p.y, z: -s * p.x + c * p.z }
}

export function rotX(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x, y: c * p.y - s * p.z, z: s * p.y + c * p.z }
}

export function viewPoint(lat: number, lon: number, view: RadarView): Vec3 {
  return rotX(rotY(spherePoint(lat, lon), view.yaw), view.pitch)
}

/** Screen point for a canvas of `size` pixels. Null when the place faces away. */
export function projectRadar(lat: number, lon: number, view: RadarView, size: number): { x: number; y: number } | null {
  const p = viewPoint(lat, lon, view)
  if (p.z <= 0.02) return null
  const w = view.distance - p.z
  if (w <= 0.08) return null
  const nx = (p.x * RADAR_K) / w
  const ny = (p.y * RADAR_K) / w
  return { x: (nx * 0.5 + 0.5) * size, y: (0.5 - ny * 0.5) * size }
}

export function lerpLon(from: number, to: number, t: number): number {
  let delta = to - from
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  let value = from + delta * t
  if (value > 180) value -= 360
  if (value < -180) value += 360
  return value
}

export type RadarFix = {
  noradId: string
  name: string
  kind: SkyKind
  lat: number
  lon: number
  altKm: number
  speedKms: number
}

export function lerpFixes(prev: RadarFix[], next: RadarFix[], t: number): RadarFix[] {
  const prior = new Map(prev.map((fix) => [fix.noradId, fix]))
  const blend = Math.min(1, Math.max(0, t))
  return next.map((fix) => {
    const was = prior.get(fix.noradId)
    if (!was) return fix
    return {
      ...fix,
      lat: was.lat + (fix.lat - was.lat) * blend,
      lon: lerpLon(was.lon, fix.lon, blend),
      altKm: was.altKm + (fix.altKm - was.altKm) * blend,
      speedKms: was.speedKms + (fix.speedKms - was.speedKms) * blend,
    }
  })
}
