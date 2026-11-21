import { approximateInclination, groundTrack, launchAzimuthDeg } from '@/lib/mission'
import { homePhase, type HomePhase } from '@/lib/schedule'
import type { SkyElement, SkyKind } from '@/lib/sky-point'

/** Equirectangular NASA Blue Marble (Visible Earth land, ocean, ice), public domain. */
export const EARTH_TEXTURE = '/earth/blue-marble.jpg'
/** Full disk NASA Blue Marble photograph, public domain. Shown until the globe can draw. */
export const EARTH_STILL = '/earth/blue-marble-still.jpg'

export const RADAR_COPY = {
  kicker: 'In orbit now',
  legend: 'Stations, Hubble, bright satellites, and recent Starlink trains.',
  hint: 'Tap a dot for a name, altitude, speed, and the next orbit.',
  gesture: 'Drag sideways to turn the Earth. A straight swipe up or down scrolls the page. Pinch to zoom. Double tap to come closer.',
  stillAlt: 'Earth',
  liveLabel: 'Earth. Drag sideways to turn. Pinch or double tap to zoom. Tap a satellite, the path, or your town.',
  drawing: 'Drawing the Earth.',
  legendStations: 'Stations',
  legendTrains: 'Starlink trains',
  legendBright: 'Bright satellites',
  legendYou: 'You',
  youNote: 'Your town on the Earth.',
  padLabel: 'Launch pad',
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
  starlink: 32,
  bright: 24,
}

const KIND_ORDER: SkyKind[] = ['station', 'hubble', 'starlink', 'bright']

export type RadarLaunch = {
  name: string
  rocketName: string
  padName: string
  padLat: number
  padLon: number
  track: { lat: number; lon: number }[]
  net: string | null
  statusAbbrev: string
  statusName: string
}

export type RadarTarget =
  | { type: 'sat'; id: string }
  | { type: 'you' }
  | { type: 'pad' }
  | { type: 'path' }
  | { type: 'orbit'; id: string }
  | { type: 'earth' }

export type RadarOverlay = {
  chains: { id: string; color: string; points: { lat: number; lon: number; radius?: number }[] }[]
  marks: {
    id: string
    lat: number
    lon: number
    radius?: number
    shape?: 'dot' | 'diamond' | 'moon'
    canvas?: string
    side?: 'up' | 'down' | 'left' | 'right'
  }[]
  /** Draw the line once from the start, then leave it in place. */
  traceMs?: number
}

export type RadarView = { yaw: number; pitch: number; distance: number }

export const RADAR_K = 2.7
export const PITCH_MAX = 1.02
export const DIST_MIN = 1.7
export const DIST_MAX = 8
/** Limb sits inside the square so the disc stays round, with room at the edges. */
export const DISC_MARGIN = 0.78
export function discNdc(distance: number): number {
  const safe = Math.max(distance, 1.05)
  return RADAR_K / Math.sqrt(safe * safe - 1)
}
export function distanceForDisc(margin = DISC_MARGIN): number {
  const target = Math.min(0.92, Math.max(0.45, margin))
  return Math.sqrt(1 + (RADAR_K / target) ** 2)
}
export const FITTED_DISTANCE = distanceForDisc()
export const RADAR_HOME_VIEW: RadarView = {
  yaw: (95 * Math.PI) / 180,
  pitch: (22 * Math.PI) / 180,
  distance: FITTED_DISTANCE,
}

const ZONE_FOCUS: Array<[RegExp, number, number]> = [
  [/^America\/(Denver|Boise|Phoenix|Edmonton|Cambridge_Bay|Inuvik|Yellowknife|Dawson|Whitehorse|Mazatlan|Chihuahua|Hermosillo|Ojinaga|Creston|Shiprock|Fort_Nelson)/, 39.7, -104.9],
  [/^America\/(Los_Angeles|Vancouver|Tijuana|Santa_Isabel)/, 37.5, -122],
  [/^America\/(Chicago|Winnipeg|Mexico_City|Rainy_River|Rankin_Inlet|Resolute|Matamoros|Monterrey|Merida|Bahia_Banderas|North_Dakota|Indiana|Menominee|Knox|Tell_City)/, 41, -93],
  [/^America\/(New_York|Toronto|Detroit|Kentucky|Montreal|Nassau|Iqaluit|Pangnirtung|Thunder_Bay|Nipigon|Atikokan|Jamaica|Port-au-Prince|Havana|Panama)/, 40.5, -74],
  [/^America\/(Anchorage|Juneau|Nome|Sitka|Yakutat|Metlakatla|Adak)/, 61, -150],
  [/^Pacific\/Honolulu|^America\/Honolulu/, 21.3, -157.8],
  [/^America\/(Halifax|Glace_Bay|Moncton|Goose_Bay|Blanc-Sablon|Puerto_Rico|St_Thomas|St_Johns|Barbados|Martinique)/, 44, -63],
  [/^America\/(Sao_Paulo|Argentina|Buenos_Aires|Cordoba|Mendoza|Santiago|La_Paz|Asuncion|Montevideo)/, -25, -58],
  [/^Europe\/(London|Dublin|Lisbon)/, 51.5, -0.1],
  [/^Europe\//, 50, 10],
  [/^Asia\/(Tokyo|Seoul)/, 36, 138],
  [/^Asia\/(Shanghai|Hong_Kong|Singapore|Taipei|Manila)/, 31, 121],
  [/^Asia\/(Kolkata|Calcutta|Colombo)/, 22, 78],
  [/^Asia\//, 35, 100],
  [/^Australia\/(Sydney|Melbourne|Brisbane|Hobart)/, -33, 151],
  [/^Australia\//, -25, 134],
  [/^Pacific\/Auckland/, -37, 175],
  [/^Africa\//, 5, 20],
  [/^America\//, 40, -98],
]

/** A map center for a device time zone. UTC has no place, so the caller can try the pad. */
export function focusForTimeZone(zone: string | null | undefined): { lat: number; lon: number } | null {
  if (!zone) return null
  const name = zone.trim()
  if (!name || name === 'UTC' || name === 'Etc/UTC' || name === 'Etc/GMT' || name === 'GMT') return null
  for (const [test, lat, lon] of ZONE_FOCUS) {
    if (test.test(name)) return { lat, lon }
  }
  return null
}

export function clampPitch(pitch: number): number {
  return Math.min(PITCH_MAX, Math.max(-PITCH_MAX, pitch))
}

export function clampDistance(distance: number): number {
  return Math.min(DIST_MAX, Math.max(DIST_MIN, distance))
}

/** Town, then time zone, then the next pad, then the middle of North America. */
export function openingView(input: {
  place: { lat: number; lon: number } | null
  timeZone: string | null
  launch: { padLat: number; padLon: number } | null
  focus?: { lat: number; lon: number } | null
  distance?: number
}): RadarView {
  const place = input.place && Number.isFinite(input.place.lat) && Number.isFinite(input.place.lon) ? input.place : null
  const zone = place ? null : focusForTimeZone(input.timeZone)
  const pad =
    !place && !zone && input.launch && Number.isFinite(input.launch.padLat) && Number.isFinite(input.launch.padLon)
      ? { lat: input.launch.padLat, lon: input.launch.padLon }
      : null
  const pattern =
    !place && !zone && !pad && input.focus && Number.isFinite(input.focus.lat) && Number.isFinite(input.focus.lon) ? input.focus : null
  const focus = place ?? zone ?? pad ?? pattern ?? { lat: 40, lon: -98 }
  const view = viewLookingAt(focus.lat, focus.lon, input.distance ?? FITTED_DISTANCE)
  const tilt = Math.abs(focus.lat) < 20 ? 0.16 : 0
  return { ...view, pitch: clampPitch(view.pitch + tilt) }
}

/** Move the grabbed town so it stays under the finger. Pitch stays short of upside down. */
export function dragFollow(
  view: RadarView,
  grabbed: { lat: number; lon: number },
  fingerX: number,
  fingerY: number,
  size: number,
): RadarView {
  let yaw = view.yaw
  let pitch = clampPitch(view.pitch)
  for (let step = 0; step < 12; step += 1) {
    const trial = { yaw, pitch, distance: view.distance }
    const spot = projectRadar(grabbed.lat, grabbed.lon, trial, size)
    if (!spot) break
    const errX = fingerX - spot.x
    const errY = fingerY - spot.y
    if (errX * errX + errY * errY < 0.16) break
    const eps = 0.0015
    const sx = projectRadar(grabbed.lat, grabbed.lon, { ...trial, yaw: yaw + eps }, size)
    const sy = projectRadar(grabbed.lat, grabbed.lon, { ...trial, pitch: clampPitch(pitch + eps) }, size)
    if (!sx || !sy) break
    const jxx = (sx.x - spot.x) / eps
    const jyx = (sx.y - spot.y) / eps
    const jxy = (sy.x - spot.x) / eps
    const jyy = (sy.y - spot.y) / eps
    const det = jxx * jyy - jxy * jyx
    if (Math.abs(det) < 1e-4) break
    const dyaw = (errX * jyy - errY * jxy) / det
    const dpitch = (jxx * errY - jyx * errX) / det
    const limit = 0.9
    yaw += Math.min(limit, Math.max(-limit, dyaw))
    const nextPitch = pitch + Math.min(limit, Math.max(-limit, dpitch))
    pitch = clampPitch(nextPitch)
    if (nextPitch !== pitch) break
  }
  return { yaw, pitch, distance: view.distance }
}

/** Keep a surface point under the finger while the camera distance changes. */
export function lookUnderFinger(
  view: RadarView,
  grabbed: { lat: number; lon: number } | null,
  fingerX: number,
  fingerY: number,
  size: number,
  distance: number,
): RadarView {
  const next = { ...view, distance: clampDistance(distance) }
  if (!grabbed) return next
  return dragFollow(next, grabbed, fingerX, fingerY, size)
}

/** A quick vertical move scrolls the page. A sideways move turns the Earth. */
export function gestureIntent(dx: number, dy: number, moved: number, slop = 12): 'undecided' | 'scroll' | 'turn' {
  if (moved < slop) return 'undecided'
  if (Math.abs(dx) > Math.abs(dy) * 1.35) return 'turn'
  return 'scroll'
}

/** Radians per millisecond, eased so a flick settles instead of stopping dead. */
export function dampVelocity(velocity: number, dtMs: number, tauMs = 320): number {
  if (!Number.isFinite(velocity) || !Number.isFinite(dtMs) || dtMs <= 0) return velocity
  return velocity * Math.exp(-dtMs / tauMs)
}

export function velocityFromSamples(samples: { t: number; yaw: number; pitch: number }[]): { yaw: number; pitch: number } {
  if (samples.length < 2) return { yaw: 0, pitch: 0 }
  const first = samples[0]
  const last = samples[samples.length - 1]
  const dt = Math.max(8, last.t - first.t)
  let dyaw = last.yaw - first.yaw
  if (dyaw > Math.PI) dyaw -= Math.PI * 2
  if (dyaw < -Math.PI) dyaw += Math.PI * 2
  const cap = 0.012
  return {
    yaw: Math.min(cap, Math.max(-cap, dyaw / dt)),
    pitch: Math.min(cap, Math.max(-cap, (last.pitch - first.pitch) / dt)),
  }
}

/** Smooth step from one camera to another. Yaw takes the short way around. */
export function easeView(from: RadarView, to: RadarView, u: number): RadarView {
  const clamped = Math.min(1, Math.max(0, u))
  const t = clamped * clamped * (3 - 2 * clamped)
  let dyaw = to.yaw - from.yaw
  if (dyaw > Math.PI) dyaw -= Math.PI * 2
  if (dyaw < -Math.PI) dyaw += Math.PI * 2
  return {
    yaw: from.yaw + dyaw * t,
    pitch: clampPitch(from.pitch + (to.pitch - from.pitch) * t),
    distance: clampDistance(from.distance + (to.distance - from.distance) * t),
  }
}

/** Second tap zooms toward the finger. A second tap while already close returns to the opening distance. */
export function doubleTapDistance(distance: number, homeDistance: number): { distance: number; recenter: boolean } {
  const home = clampDistance(homeDistance)
  if (distance < home * 0.92) return { distance: home, recenter: true }
  return { distance: clampDistance(distance * 0.68), recenter: false }
}

export function wheelDistance(distance: number, deltaY: number, deltaMode = 0): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY
  return clampDistance(distance * Math.exp(pixels * 0.0011))
}

export function globeRadiusPx(size: number, distance: number): number {
  const nx = RADAR_K / Math.max(distance - 0.2, 0.45)
  return Math.min(size * 0.48, nx * 0.5 * size)
}

export function pathCaption(launch: { rocketName: string; name: string }, phase: HomePhase): string | null {
  if (phase === 'flown') return null
  const rocket = (launch.rocketName || launch.name).replace(/[—–-]/g, ' ').replace(/\s+/g, ' ').trim() || 'Rocket'
  if (phase === 'lifting') return `${rocket} path, lifting off`
  return `${rocket} path, next launch`
}

export function launchPhase(launch: { net: string | null; statusAbbrev?: string; statusName?: string }, now = Date.now()): HomePhase {
  return homePhase(launch, now)
}

/** Put a latitude and longitude at the middle of the disc. */
export function viewLookingAt(lat: number, lon: number, distance = 2.8): RadarView {
  return {
    yaw: (-lon * Math.PI) / 180,
    pitch: clampPitch((lat * Math.PI) / 180),
    distance: clampDistance(distance),
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
    rocketName?: string | null
    padName: string
    padLat: number | null
    padLon: number | null
    orbitName: string | null
    orbitAbbrev: string | null
    net?: string | null
    statusAbbrev?: string | null
    statusName?: string | null
  } | null,
): RadarLaunch | null {
  if (!launch || launch.padLat == null || launch.padLon == null) return null
  const inclination = approximateInclination(launch.orbitName, launch.orbitAbbrev, launch.padLat)
  const azimuth = launchAzimuthDeg(launch.padLat, inclination)
  if (azimuth == null) return null
  const track = groundTrack(launch.padLat, launch.padLon, azimuth)
  if (track.length < 2) return null
  return {
    name: launch.name,
    rocketName: (launch.rocketName || launch.name).trim(),
    padName: launch.padName,
    padLat: launch.padLat,
    padLon: launch.padLon,
    track,
    net: launch.net ?? null,
    statusAbbrev: launch.statusAbbrev ?? '',
    statusName: launch.statusName ?? '',
  }
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

/** Latitude and longitude under a canvas pixel. Null when the finger misses the Earth. */
export function latLonAt(x: number, y: number, view: RadarView, size: number): { lat: number; lon: number } | null {
  if (!(size > 0)) return null
  const nx = (x / size - 0.5) * 2
  const ny = (0.5 - y / size) * 2
  const s = nx / RADAR_K
  const t = ny / RADAR_K
  const a = s * s + t * t
  const A = a + 1
  const B = -2 * a * view.distance
  const C = a * view.distance * view.distance - 1
  const disc = B * B - 4 * A * C
  if (disc < 0 || A === 0) return null
  const root = Math.sqrt(disc)
  const u = Math.max((-B + root) / (2 * A), (-B - root) / (2 * A))
  if (u <= 0.02) return null
  const q = { x: s * (view.distance - u), y: t * (view.distance - u), z: u }
  const objectPoint = rotY(rotX(q, -view.pitch), -view.yaw)
  const lat = (Math.asin(Math.max(-1, Math.min(1, objectPoint.y))) * 180) / Math.PI
  let lon = (Math.atan2(objectPoint.x, objectPoint.z) * 180) / Math.PI
  if (lon > 180) lon -= 360
  if (lon < -180) lon += 360
  return { lat, lon }
}

/** Screen point for a canvas of `size` pixels. Null when the place faces away. */
export function projectRadar(lat: number, lon: number, view: RadarView, size: number, radius = 1): { x: number; y: number } | null {
  const base = spherePoint(lat, lon)
  const lifted = { x: base.x * radius, y: base.y * radius, z: base.z * radius }
  const p = rotX(rotY(lifted, view.yaw), view.pitch)
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
