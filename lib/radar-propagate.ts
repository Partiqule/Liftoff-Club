// satellite.js v7's package entry also loads a WASM build that Next cannot
// ship to the browser. These files are the plain JavaScript SGP4.
import { twoline2satrec } from '../node_modules/satellite.js/dist/io.js'
import { gstime, propagate } from '../node_modules/satellite.js/dist/propagation.js'
import type { SatRec } from '../node_modules/satellite.js/dist/propagation/SatRec.js'
import { eciToGeodetic, radiansToDegrees } from '../node_modules/satellite.js/dist/transforms.js'
import type { RadarFix } from '@/lib/radar'
import type { SkyElement } from '@/lib/sky-point'
import { meanMotion } from '@/lib/tle-select'

export type RadarBody = {
  noradId: string
  name: string
  kind: RadarFix['kind']
  line2: string
  satrec: SatRec
}

export function prepareBodies(objects: SkyElement[]): RadarBody[] {
  const bodies: RadarBody[] = []
  for (const object of objects) {
    try {
      const satrec = twoline2satrec(object.line1, object.line2)
      if (satrec.error) continue
      bodies.push({ noradId: object.noradId, name: object.name, kind: object.kind, line2: object.line2, satrec })
    } catch {
      // A bad element is skipped. The globe still draws the rest.
    }
  }
  return bodies
}

export function fixesAt(bodies: RadarBody[], date: Date): RadarFix[] {
  const fixes: RadarFix[] = []
  for (const body of bodies) {
    const fix = sample(body, date)
    if (fix) fixes.push(fix)
  }
  return fixes
}

/** One revolution of ground track, starting at `date`. */
export function orbitTrack(body: RadarBody, date: Date, samples = 64): { lat: number; lon: number }[] {
  const motion = meanMotion(body.line2)
  if (!Number.isFinite(motion) || motion <= 0.2) return []
  const periodMs = (86400 / motion) * 1000
  const points: { lat: number; lon: number }[] = []
  for (let index = 0; index < samples; index += 1) {
    const fix = sample(body, new Date(date.getTime() + (periodMs * index) / samples))
    if (fix) points.push({ lat: fix.lat, lon: fix.lon })
  }
  return points.length >= 8 ? points : []
}

function sample(body: RadarBody, date: Date): RadarFix | null {
  const pv = propagate(body.satrec, date)
  if (!pv || !isVec(pv.position)) return null
  const geo = eciToGeodetic(pv.position, gstime(date))
  const lat = radiansToDegrees(geo.latitude)
  const lon = radiansToDegrees(geo.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(geo.height)) return null
  const speed = isVec(pv.velocity) ? Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z) : Number.NaN
  return {
    noradId: body.noradId,
    name: body.name,
    kind: body.kind,
    lat,
    lon,
    altKm: geo.height,
    speedKms: speed,
  }
}

function isVec(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== 'object') return false
  const vec = value as { x?: unknown; y?: unknown; z?: unknown }
  return typeof vec.x === 'number' && typeof vec.y === 'number' && typeof vec.z === 'number' && Number.isFinite(vec.x)
}
