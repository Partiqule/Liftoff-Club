import type { Launch, TimelineEvent } from '@/lib/types'

export type TrackPoint = { lat: number; lon: number }

const INTERESTING = /liftoff|max[- ]?q|meco|stage sep|fairing|seco|ses-|deploy|landing|entry burn|orbit/i

export function formatMissionClock(elapsedSec: number): string {
  const sign = elapsedSec < 0 ? 'T−' : 'T+'
  const abs = Math.max(0, Math.floor(Math.abs(elapsedSec)))
  const hours = Math.floor(abs / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const seconds = abs % 60
  const body = hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
  return `${sign} ${body}`
}

export function elapsedSeconds(net: string | null, nowMs: number): number | null {
  if (!net) return null
  const when = Date.parse(net)
  if (!Number.isFinite(when)) return null
  return (nowMs - when) / 1000
}

export function currentPhase(events: TimelineEvent[], elapsedSec: number | null): string {
  if (elapsedSec == null) return 'Waiting on a clock'
  let name = elapsedSec < 0 ? 'Prelaunch' : 'Ascent'
  for (const event of events) {
    if (event.offsetSec <= elapsedSec + 1) name = event.abbrev
  }
  return name
}

export function missionEvents(launch: Pick<Launch, 'timeline' | 'rocketName' | 'rocketFamily'>): {
  official: boolean
  events: TimelineEvent[]
} {
  if (launch.timeline.length > 0) {
    const picked = launch.timeline.filter((event) => INTERESTING.test(`${event.abbrev} ${event.description}`))
    const events = (picked.length >= 3 ? picked : launch.timeline).slice().sort((a, b) => a.offsetSec - b.offsetSec)
    return { official: true, events: events.slice(0, 16) }
  }
  return { official: false, events: typicalTimeline(launch.rocketFamily, launch.rocketName) }
}

export function typicalTimeline(family: string | null, rocketName: string): TimelineEvent[] {
  const text = `${family ?? ''} ${rocketName}`.toLowerCase()
  if (text.includes('starship')) return STARSHIP
  if (text.includes('electron')) return ELECTRON
  if (text.includes('falcon')) return FALCON
  return GENERIC_FLIGHT
}

/**
 * Launch azimuth from north, degrees, for a non-rotating sphere.
 * sin(azimuth) = cos(inclination) / cos(latitude).
 * Returns null when that inclination cannot be reached from the pad.
 */
export function launchAzimuthDeg(latDeg: number, inclinationDeg: number): number | null {
  const ratio = Math.cos(toRad(inclinationDeg)) / Math.cos(toRad(latDeg))
  if (!Number.isFinite(ratio) || Math.abs(ratio) > 1) return null
  const primary = toDeg(Math.asin(ratio))
  if (inclinationDeg > 90) return wrap360(180 - primary)
  return wrap360(primary)
}

export function approximateInclination(orbitName: string | null, orbitAbbrev: string | null, padLat: number | null): number {
  const text = `${orbitAbbrev ?? ''} ${orbitName ?? ''}`.toLowerCase()
  if (/sso|sun-synchronous|sun synchronous/.test(text)) return 97.4
  if (/polar/.test(text)) return 90
  if (/geo|gto/.test(text)) return 28.5
  if (/iss|station/.test(text)) return 51.6
  return Math.min(97, Math.max(Math.abs(padLat ?? 28), 28))
}

/** Great-circle points starting at the pad, stepping along the launch azimuth. */
export function groundTrack(latDeg: number, lonDeg: number, azimuthDeg: number, steps = 56, stepDeg = 3.2): TrackPoint[] {
  const points: TrackPoint[] = []
  let lat = latDeg
  let lon = lonDeg
  points.push({ lat, lon })
  for (let index = 0; index < steps; index += 1) {
    const next = stepGreatCircle(lat, lon, azimuthDeg, stepDeg)
    points.push(next)
    lat = next.lat
    lon = next.lon
  }
  return points
}

export function pointAlong(track: TrackPoint[], progress: number): TrackPoint | null {
  if (track.length === 0) return null
  const clamped = Math.min(1, Math.max(0, progress))
  const scaled = clamped * (track.length - 1)
  const index = Math.floor(scaled)
  const next = Math.min(track.length - 1, index + 1)
  const blend = scaled - index
  const start = track[index]
  const end = track[next]
  return {
    lat: start.lat + (end.lat - start.lat) * blend,
    lon: start.lon + (end.lon - start.lon) * blend,
  }
}

/** 0 at liftoff, 1 after about ten minutes of climb. Before liftoff the dot stays at the pad. */
export function subsolar(nowMs: number): TrackPoint {
  const date = new Date(nowMs)
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const day = (date.getTime() - start) / 86_400_000
  const lat = 23.44 * Math.sin((2 * Math.PI * (day - 81)) / 365)
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  let lon = 180 - hours * 15
  if (lon > 180) lon -= 360
  if (lon < -180) lon += 360
  return { lat, lon }
}

export function trackProgress(elapsedSec: number | null): number {
  if (elapsedSec == null || elapsedSec <= 0) return 0
  return Math.min(1, elapsedSec / 600)
}

function stepGreatCircle(latDeg: number, lonDeg: number, azimuthDeg: number, distanceDeg: number): TrackPoint {
  const φ1 = toRad(latDeg)
  const λ1 = toRad(lonDeg)
  const θ = toRad(azimuthDeg)
  const δ = toRad(distanceDeg)
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
  return { lat: toDeg(φ2), lon: wrap180(toDeg(λ2)) }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function wrap180(deg: number): number {
  const wrapped = wrap360(deg)
  return wrapped > 180 ? wrapped - 360 : wrapped
}

const FALCON: TimelineEvent[] = [
  { abbrev: 'Liftoff', description: 'The vehicle leaves the pad.', offsetSec: 0 },
  { abbrev: 'Max Q', description: 'The air pushes hardest somewhere near this minute.', offsetSec: 70 },
  { abbrev: 'MECO', description: 'First stage engines shut down.', offsetSec: 150 },
  { abbrev: 'Stage separation', description: 'The first stage lets go.', offsetSec: 165 },
  { abbrev: 'Fairing separation', description: 'The nose opens.', offsetSec: 210 },
  { abbrev: 'Landing', description: 'The first stage attempts a landing.', offsetSec: 480 },
  { abbrev: 'SECO', description: 'The second stage engine shuts down.', offsetSec: 520 },
  { abbrev: 'Payload deploy', description: 'The satellites leave the rocket.', offsetSec: 900 },
]

const STARSHIP: TimelineEvent[] = [
  { abbrev: 'Liftoff', description: 'The stack leaves the pad.', offsetSec: 0 },
  { abbrev: 'Max Q', description: 'The air pushes hardest in the first minute.', offsetSec: 60 },
  { abbrev: 'MECO', description: 'The booster engines shut down.', offsetSec: 160 },
  { abbrev: 'Stage separation', description: 'The ship lets go of the booster.', offsetSec: 170 },
  { abbrev: 'SECO', description: 'The ship engines shut down.', offsetSec: 500 },
  { abbrev: 'Payload deploy', description: 'The satellites leave the ship, when this flight carries them.', offsetSec: 800 },
]

const ELECTRON: TimelineEvent[] = [
  { abbrev: 'Liftoff', description: 'Electron leaves the pad.', offsetSec: 0 },
  { abbrev: 'Max Q', description: 'The air pushes hardest in the first minute.', offsetSec: 75 },
  { abbrev: 'MECO', description: 'The first stage engines shut down.', offsetSec: 150 },
  { abbrev: 'Stage separation', description: 'The stages separate.', offsetSec: 160 },
  { abbrev: 'SECO', description: 'The upper stage shuts down.', offsetSec: 500 },
  { abbrev: 'Payload deploy', description: 'The satellite leaves the rocket.', offsetSec: 560 },
]

const GENERIC_FLIGHT: TimelineEvent[] = [
  { abbrev: 'Liftoff', description: 'The vehicle leaves the pad.', offsetSec: 0 },
  { abbrev: 'Max Q', description: 'The air usually pushes hardest in the first two minutes.', offsetSec: 80 },
  { abbrev: 'MECO', description: 'A first stage shutdown is typical a few minutes in.', offsetSec: 160 },
  { abbrev: 'Stage separation', description: 'Stages separate after the first burn.', offsetSec: 175 },
  { abbrev: 'SECO', description: 'An upper stage shutdown follows on an orbital flight.', offsetSec: 540 },
  { abbrev: 'Payload deploy', description: 'The cargo separates when it is on the planned path.', offsetSec: 900 },
]
