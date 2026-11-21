// satellite.js v7's package entry also loads a WASM build that Next cannot
// ship to the browser. These files are the pure JavaScript SGP4, loaded only
// with the sky finder page.
import { twoline2satrec } from '../node_modules/satellite.js/dist/io.js'
import { gstime, propagate } from '../node_modules/satellite.js/dist/propagation.js'
import type { SatRec } from '../node_modules/satellite.js/dist/propagation/SatRec.js'
import { degreesToRadians, eciToEcf, eciToGeodetic, ecfToLookAngles, radiansToDegrees } from '../node_modules/satellite.js/dist/transforms.js'
import { satelliteInSunlight, sunEciUnit, sunPosition } from '@/lib/solar'
import { eyeVisible, type SkyElement, type SkyFix } from '@/lib/sky-point'

export type Observer = { lat: number; lon: number }

type Look = { azimuth: number; elevation: number; illuminated: boolean }

export async function surveySky(objects: SkyElement[], observer: Observer, now: Date, windowMin = 30): Promise<SkyFix[]> {
  const fixes: SkyFix[] = []
  const end = now.getTime() + windowMin * 60_000
  for (let index = 0; index < objects.length; index += 1) {
    const fix = fixOne(objects[index], observer, now, end)
    if (fix) fixes.push(fix)
    if (index % 24 === 23) await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return fixes
}

export function refreshFixes(objects: SkyElement[], fixes: SkyFix[], observer: Observer, now: Date): SkyFix[] {
  const byId = new Map(objects.map((object) => [object.noradId, object]))
  const sun = sunPosition(observer.lat, observer.lon, now)
  const next: SkyFix[] = []
  for (const fix of fixes) {
    const object = byId.get(fix.noradId)
    if (!object) continue
    const look = lookNow(object, observer, now)
    if (!look) continue
    const above = look.elevation > 0
    if (!above && fix.riseAt == null) continue
    next.push({
      ...fix,
      azimuth: look.azimuth,
      elevation: look.elevation,
      illuminated: look.illuminated,
      above,
      visible: above && eyeVisible(look.illuminated, sun.elevation),
      riseAt: above ? null : fix.riseAt,
      riseAzimuth: above ? null : fix.riseAzimuth,
    })
  }
  return next
}

export function lookNow(object: SkyElement, observer: Observer, date: Date): Look | null {
  const satrec = satrecFor(object.line1, object.line2)
  if (!satrec) return null
  return sample(satrec, observer, date)
}

function fixOne(object: SkyElement, observer: Observer, now: Date, endMs: number): SkyFix | null {
  const satrec = satrecFor(object.line1, object.line2)
  if (!satrec) return null
  const current = sample(satrec, observer, now)
  if (!current) return null
  const sunNow = sunPosition(observer.lat, observer.lon, now)
  if (current.elevation > 0) {
    return {
      noradId: object.noradId,
      azimuth: current.azimuth,
      elevation: current.elevation,
      illuminated: current.illuminated,
      visible: eyeVisible(current.illuminated, sunNow.elevation),
      above: true,
      riseAt: null,
      riseAzimuth: null,
      visibleAtRise: false,
      litAtRise: false,
    }
  }
  for (let time = now.getTime() + 60_000; time <= endMs; time += 60_000) {
    const when = new Date(time)
    const look = sample(satrec, observer, when)
    if (!look || look.elevation <= 0) continue
    const sun = sunPosition(observer.lat, observer.lon, when)
    return {
      noradId: object.noradId,
      azimuth: current.azimuth,
      elevation: current.elevation,
      illuminated: current.illuminated,
      visible: false,
      above: false,
      riseAt: time,
      riseAzimuth: look.azimuth,
      visibleAtRise: eyeVisible(look.illuminated, sun.elevation),
      litAtRise: look.illuminated,
    }
  }
  return null
}

export type SkyPass = {
  altKm: number
  speedKms: number
  azimuth: number
  elevation: number
  setAt: number | null
  setAzimuth: number | null
  riseAt: number | null
  riseAzimuth: number | null
  path: { azimuth: number; elevation: number }[]
}

/** One object: altitude, speed, rise or set, and the arc while it is up. */
export function skyPass(object: SkyElement, observer: Observer, now: Date): SkyPass | null {
  const satrec = satrecFor(object.line1, object.line2)
  if (!satrec) return null
  const current = sampleRich(satrec, observer, now)
  if (!current) return null
  const start = now.getTime()
  let riseAt: number | null = null
  let riseAzimuth: number | null = null
  let setAt: number | null = null
  let setAzimuth: number | null = null
  let began = current.elevation > 0 ? start : 0
  const step = 20_000
  const limit = start + 40 * 60_000
  for (let time = start + step; time <= limit; time += step) {
    const look = sampleRich(satrec, observer, new Date(time))
    if (!look) continue
    if (began === 0 && look.elevation > 0) {
      began = time
      riseAt = time
      riseAzimuth = look.azimuth
    }
    if (began > 0 && look.elevation <= 0) {
      setAt = time
      setAzimuth = look.azimuth
      break
    }
  }
  const path: { azimuth: number; elevation: number }[] = []
  if (began > 0) {
    const end = setAt ?? Math.min(limit, began + 20 * 60_000)
    const span = Math.max(step, end - began)
    const hop = Math.max(step, Math.round(span / 24))
    for (let time = began; time <= end; time += hop) {
      const look = sampleRich(satrec, observer, new Date(time))
      if (look && look.elevation > 0) path.push({ azimuth: look.azimuth, elevation: look.elevation })
    }
  }
  return {
    altKm: current.altKm,
    speedKms: current.speedKms,
    azimuth: current.azimuth,
    elevation: current.elevation,
    setAt,
    setAzimuth,
    riseAt: current.elevation > 0 ? null : riseAt,
    riseAzimuth: current.elevation > 0 ? null : riseAzimuth,
    path,
  }
}

function satrecFor(line1: string, line2: string): SatRec | null {
  try {
    const satrec = twoline2satrec(line1, line2)
    if (satrec.error) return null
    return satrec
  } catch {
    return null
  }
}

function sample(satrec: SatRec, observer: Observer, date: Date): Look | null {
  const pv = propagate(satrec, date)
  if (!pv || !isVec(pv.position)) return null
  const gmst = gstime(date)
  const ecf = eciToEcf(pv.position, gmst)
  const look = ecfToLookAngles(
    {
      longitude: degreesToRadians(observer.lon),
      latitude: degreesToRadians(observer.lat),
      height: 0.05,
    },
    ecf,
  )
  return {
    azimuth: (radiansToDegrees(look.azimuth) + 360) % 360,
    elevation: radiansToDegrees(look.elevation),
    illuminated: satelliteInSunlight(pv.position, sunEciUnit(date)),
  }
}

function sampleRich(satrec: SatRec, observer: Observer, date: Date): (Look & { altKm: number; speedKms: number }) | null {
  const pv = propagate(satrec, date)
  if (!pv || !isVec(pv.position)) return null
  const look = sample(satrec, observer, date)
  if (!look) return null
  const geo = eciToGeodetic(pv.position, gstime(date))
  const speed = isVec(pv.velocity) ? Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z) : Number.NaN
  return { ...look, altKm: geo.height, speedKms: speed }
}

function isVec(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== 'object') return false
  const vec = value as { x?: unknown; y?: unknown; z?: unknown }
  return typeof vec.x === 'number' && typeof vec.y === 'number' && typeof vec.z === 'number' && Number.isFinite(vec.x)
}
