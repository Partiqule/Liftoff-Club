// satellite.js v7's package entry also loads a WASM build that Next cannot
// ship to the browser. These files are the pure-JS SGP4 used for family passes.
import { twoline2satrec } from '../node_modules/satellite.js/dist/io.js'
import { gstime, propagate } from '../node_modules/satellite.js/dist/propagation.js'
import type { SatRec } from '../node_modules/satellite.js/dist/propagation/SatRec.js'
import {
  degreesToRadians,
  eciToEcf,
  ecfToLookAngles,
  radiansToDegrees,
} from '../node_modules/satellite.js/dist/transforms.js'
import { gradePass } from '@/lib/planner'
import { satelliteInSunlight, sunEciUnit, sunPosition } from '@/lib/solar'
import { displaySatName, noradId, type ParsedTle } from '@/lib/tle-select'
import type { SkyPass } from '@/lib/types'

export type Observer = { lat: number; lon: number; heightM?: number }

type Sample = {
  time: Date
  elevation: number
  azimuth: number
  illuminated: boolean
}

type SatInput = ParsedTle & { kind: 'iss' | 'starlink' }

export function predictPasses(sats: SatInput[], observer: Observer, start: Date, end: Date): SkyPass[] {
  const passes: SkyPass[] = []
  for (const sat of sats) {
    passes.push(...passesForSatellite(sat, observer, start, end))
  }
  return passes.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

export async function predictPassesYielding(
  sats: SatInput[],
  observer: Observer,
  start: Date,
  end: Date,
): Promise<SkyPass[]> {
  const passes: SkyPass[] = []
  for (const sat of sats) {
    passes.push(...passesForSatellite(sat, observer, start, end))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return passes.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

function passesForSatellite(sat: SatInput, observer: Observer, start: Date, end: Date): SkyPass[] {
  let satrec: SatRec
  try {
    satrec = twoline2satrec(sat.line1, sat.line2)
  } catch {
    return []
  }
  const coarseStep = sat.kind === 'iss' ? 30_000 : 45_000
  const coarse = collectSamples(satrec, observer, start, end, coarseStep, 5)
  const windows = groupSamples(coarse, coarseStep)
  const passes: SkyPass[] = []
  for (const window of windows) {
    const refinedStart = new Date(window[0].time.getTime() - 60_000)
    const refinedEnd = new Date(window[window.length - 1].time.getTime() + 60_000)
    const fine = collectSamples(satrec, observer, refinedStart, refinedEnd, 5_000, 10)
    const grouped = groupSamples(fine, 5_000)
    for (const group of grouped) {
      const pass = toPass(sat, group, observer)
      if (pass) passes.push(pass)
    }
  }
  return passes
}

function collectSamples(
  satrec: SatRec,
  observer: Observer,
  start: Date,
  end: Date,
  stepMs: number,
  minElevation: number,
): Sample[] {
  const samples: Sample[] = []
  const looker = {
    longitude: degreesToRadians(observer.lon),
    latitude: degreesToRadians(observer.lat),
    height: (observer.heightM ?? 50) / 1000,
  }
  for (let time = start.getTime(); time <= end.getTime(); time += stepMs) {
    const date = new Date(time)
    const pv = propagate(satrec, date)
    if (!pv || !isVec(pv.position)) continue
    const gmst = gstime(date)
    const ecf = eciToEcf(pv.position, gmst)
    const look = ecfToLookAngles(looker, ecf)
    const elevation = radiansToDegrees(look.elevation)
    if (elevation < minElevation) continue
    const sun = sunEciUnit(date)
    samples.push({
      time: date,
      elevation,
      azimuth: (radiansToDegrees(look.azimuth) + 360) % 360,
      illuminated: satelliteInSunlight(pv.position, sun),
    })
  }
  return samples
}

function isVec(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== 'object') return false
  const vec = value as { x?: unknown; y?: unknown; z?: unknown }
  return typeof vec.x === 'number' && typeof vec.y === 'number' && typeof vec.z === 'number' && Number.isFinite(vec.x)
}

function groupSamples(samples: Sample[], stepMs: number): Sample[][] {
  const groups: Sample[][] = []
  let current: Sample[] = []
  for (const sample of samples) {
    const previous = current[current.length - 1]
    if (previous && sample.time.getTime() - previous.time.getTime() > stepMs * 1.8) {
      if (current.length >= 2) groups.push(current)
      current = []
    }
    current.push(sample)
  }
  if (current.length >= 2) groups.push(current)
  return groups
}

function toPass(sat: SatInput, samples: Sample[], observer: Observer): SkyPass | null {
  let peak = samples[0]
  for (const sample of samples) {
    if (sample.elevation > peak.elevation) peak = sample
  }
  const start = samples[0]
  const end = samples[samples.length - 1]
  const durationSec = (end.time.getTime() - start.time.getTime()) / 1000
  if (durationSec < 20 || peak.elevation < 10) return null
  const sunElevation = sunPosition(observer.lat, observer.lon, peak.time).elevation
  const setsInShadow = peak.illuminated && !end.illuminated
  const graded = gradePass({
    kind: sat.kind,
    maxElevation: peak.elevation,
    sunElevation,
    illuminated: peak.illuminated,
    setsInShadow,
  })
  const id = `${noradId(sat.line1)}-${start.time.toISOString()}`
  return {
    id,
    name: displaySatName(sat.name, sat.kind),
    kind: sat.kind,
    noradId: noradId(sat.line1),
    start: start.time.toISOString(),
    peak: peak.time.toISOString(),
    end: end.time.toISOString(),
    riseAzimuth: start.azimuth,
    peakAzimuth: peak.azimuth,
    setAzimuth: end.azimuth,
    maxElevation: peak.elevation,
    durationSec,
    illuminatedAtPeak: peak.illuminated,
    sunElevationAtPeak: sunElevation,
    setsInShadow,
    grade: graded.grade,
    gradeLabel: graded.gradeLabel,
    gradeReason: graded.gradeReason,
  }
}
