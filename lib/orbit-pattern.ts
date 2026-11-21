import { approximateInclination } from '@/lib/mission'

/** Earth radius used only to turn a height into an orbit period. */
const EARTH_KM = 6371
const MU_KM3_S2 = 398600.4418
/** Sidereal rotation, radians per second. */
const EARTH_ROT = 7.292115e-5
/** Drawn just outside the disc so a high ring still fits on the screen. */
export const GEO_DRAW_RADIUS = 1.18
export const GTO_PERIGEE_RADIUS = 1.04
export const GTO_APOGEE_RADIUS = 1.16
export const LUNAR_PEAK_RADIUS = 1.62

export type OrbitKind = 'leo' | 'sso' | 'polar' | 'geo' | 'gto' | 'lunar' | 'escape' | 'suborbital'

export type OrbitAnchor = { lat: number; lon: number; label: string; detail: string }

export type OrbitSpec = {
  kind: OrbitKind
  /** Degrees. Retrograde paths use a number past 90. */
  inclinationDeg: number
  /** Kilometers above the surface. A sketch may ignore this for the shape. */
  altitudeKm: number
  /** True when the height is a typical value for the kind of path, not a figure from the listing. */
  altitudeIsTypical?: boolean
  /** Where a closed path should cross the equator, or where a hop starts. */
  anchor?: { lat: number; lon: number }
  label?: string
  explanation?: string
  /** Tap detail for the line itself. */
  detail?: string
  lunar?: {
    launch: OrbitAnchor
    splashdown: OrbitAnchor
    apex: OrbitAnchor
  }
}

export type OrbitPoint = { lat: number; lon: number; radius: number }

export type OrbitChain = { id: string; color: string; points: OrbitPoint[] }

export type OrbitMark = OrbitAnchor & { id: string; lat: number; lon: number; radius: number }

export type OrbitPattern = {
  kind: OrbitKind
  label: string
  explanation: string
  detail: string
  inclinationDeg: number
  altitudeKm: number
  altitudeIsTypical: boolean
  focus: { lat: number; lon: number }
  distance: number
  chains: OrbitChain[]
  marks: OrbitMark[]
}

const PATH = '#f3d7b0'

export const ORBIT_UI = {
  gesture: 'Drag sideways to turn the Earth. A straight swipe up or down scrolls the page. Pinch to zoom. Double tap to come closer. Tap the line, a mark, or the Earth.',
  earthTitle: 'Earth',
  earthDetail: 'NASA Blue Marble photograph, public domain. The line is a sketch of the path, not a live satellite.',
  close: 'Close',
  credit: 'Earth image: NASA Blue Marble, public domain.',
  ascentTitle: 'Climb',
  ascentDetail: 'An approximate path away from the pad for the first minutes. It is not the full orbit.',
  tiltLabel: 'Drawing tilt',
  heightLabel: 'Drawing height',
} as const

export function orbitPeriodSec(altitudeKm: number): number {
  const radius = EARTH_KM + Math.max(0, altitudeKm)
  return 2 * Math.PI * Math.sqrt((radius * radius * radius) / MU_KM3_S2)
}

/** How many degrees Earth turns during one circular orbit at this height. */
export function westwardStepDeg(altitudeKm: number): number {
  return ((EARTH_ROT * orbitPeriodSec(altitudeKm)) * 180) / Math.PI
}

/** Highest latitude a circular orbit at this tilt can reach. */
export function maxLatitudeDeg(inclinationDeg: number): number {
  const tilt = Math.abs(inclinationDeg) % 180
  const reach = tilt <= 90 ? tilt : 180 - tilt
  return Math.min(90, reach)
}

export function buildOrbitPattern(spec: OrbitSpec): OrbitPattern {
  const kind = spec.kind
  const inclinationDeg = normalizeTilt(spec.inclinationDeg)
  const altitudeKm = Math.max(0, spec.altitudeKm)
  const anchor = spec.anchor ?? { lat: 0, lon: -80 }
  const built = geometry(kind, inclinationDeg, altitudeKm, anchor, spec.lunar)
  const words = wordsFor(kind, inclinationDeg, altitudeKm, spec.altitudeIsTypical === true)
  return {
    kind,
    label: spec.label?.trim() || words.label,
    explanation: spec.explanation?.trim() || words.explanation,
    detail: spec.detail?.trim() || words.detail,
    inclinationDeg,
    altitudeKm,
    altitudeIsTypical: spec.altitudeIsTypical === true,
    focus: built.focus,
    distance: built.distance,
    chains: built.chains,
    marks: built.marks,
  }
}

export function formatTilt(pattern: Pick<OrbitPattern, 'kind' | 'inclinationDeg'>): string {
  if (pattern.kind === 'lunar' || pattern.kind === 'escape') return 'Sketch'
  const rounded = Math.round(pattern.inclinationDeg * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text} deg`
}

export function formatHeight(pattern: Pick<OrbitPattern, 'kind' | 'altitudeKm' | 'altitudeIsTypical'>): string {
  if (pattern.kind === 'lunar' || pattern.kind === 'escape' || pattern.kind === 'suborbital') return 'Sketch'
  const rounded = Math.round(pattern.altitudeKm)
  const text = rounded.toLocaleString('en-US')
  return pattern.altitudeIsTypical ? `About ${text} km` : `${text} km`
}

type LaunchOrbitInput = {
  name: string
  rocketName?: string | null
  missionName?: string | null
  orbitName: string | null
  orbitAbbrev: string | null
  padLat: number | null
  padLon: number | null
}

/** A drawing spec from a public listing. Heights are typical unless the kind defines one. */
export function orbitSpecForLaunch(launch: LaunchOrbitInput): OrbitSpec | null {
  const text = `${launch.orbitAbbrev ?? ''} ${launch.orbitName ?? ''} ${launch.name} ${launch.missionName ?? ''}`.toLowerCase()
  const anchor =
    launch.padLat != null && launch.padLon != null ? { lat: launch.padLat, lon: launch.padLon } : undefined
  if (/lunar|translunar|\bmoon\b|apollo/.test(text)) {
    return lunarSpec(anchor)
  }
  if (/heliocentric|solar orbit|escape/.test(text)) {
    return {
      kind: 'escape',
      inclinationDeg: anchor ? approximateInclination(launch.orbitName, launch.orbitAbbrev, anchor.lat) : 28,
      altitudeKm: 0,
      altitudeIsTypical: true,
      anchor,
      label: 'Left Earth',
      explanation: 'The path leaves Earth for a trip around the Sun. The line is a sketch, not the measured track.',
      detail: 'This drawing starts at the pad and rises off the Earth. It does not trace the real trip.',
    }
  }
  if (/suborbital|sub orbital/.test(text)) {
    return {
      kind: 'suborbital',
      inclinationDeg: 90,
      altitudeKm: 100,
      altitudeIsTypical: true,
      anchor,
      label: 'Up and down',
      explanation: 'This flight goes up and comes back down. It does not stay in orbit. The arc is a sketch.',
      detail: 'A hop near the pad. The height on the drawing is not a measured altitude.',
    }
  }
  if (/\bgeo\b|geostationary/.test(text) && !/gto|transfer/.test(text)) {
    return {
      kind: 'geo',
      inclinationDeg: 0,
      altitudeKm: 35786,
      anchor,
      label: 'Geostationary ring',
      explanation:
        'A ring over the equator. At this height the orbit takes one day, so a satellite can stay above one spot. The ring is drawn close to Earth so it fits on the screen.',
      detail: 'The real ring is much higher than the line on the screen. A satellite there holds one longitude.',
    }
  }
  if (/gto|transfer/.test(text)) {
    return {
      kind: 'gto',
      inclinationDeg: anchor ? Math.max(Math.abs(anchor.lat), 28) : 28.5,
      altitudeKm: 35786,
      altitudeIsTypical: true,
      anchor,
      label: 'Transfer orbit',
      explanation:
        'An oval climb from a low orbit toward the high equatorial ring. The drawing is a typical oval, not a measured track, and it is not to scale.',
      detail: 'Low and fast on one side, high and slow on the other. The far side is still drawn close to Earth.',
    }
  }
  if (/sso|sun-synchronous|sun synchronous/.test(text)) {
    return {
      kind: 'sso',
      inclinationDeg: 97.4,
      altitudeKm: 800,
      altitudeIsTypical: true,
      anchor,
      label: 'Sun synchronous orbit',
      explanation:
        'A near polar path, tipped a little past straight up and down. This kind of orbit can keep the same sunlight on the ground. The line uses a typical tilt and height, not a measured track.',
      detail: 'The line runs close to both poles. Each loop sits a little farther west as Earth turns.',
    }
  }
  if (/polar/.test(text)) {
    return {
      kind: 'polar',
      inclinationDeg: 90,
      altitudeKm: 500,
      altitudeIsTypical: true,
      anchor,
      label: 'Polar orbit',
      explanation: 'The line runs from near the north pole to near the south pole. The height is a typical low polar orbit, not a measured track.',
      detail: 'A polar path can see almost every latitude as Earth turns underneath it.',
    }
  }
  if (/iss|space station/.test(text)) {
    return {
      kind: 'leo',
      inclinationDeg: 51.6,
      altitudeKm: 420,
      altitudeIsTypical: true,
      anchor,
      label: 'Low Earth orbit',
      explanation:
        'A low path tilted like the station, so it reaches about 52 degrees north and south. The height is typical, and the line is a sketch, not a live position.',
      detail: 'Each loop shifts west because Earth turns during the orbit.',
    }
  }
  if (/leo|low earth|orbit/.test(text)) {
    const inclination = approximateInclination(launch.orbitName, launch.orbitAbbrev, anchor?.lat ?? null)
    return {
      kind: 'leo',
      inclinationDeg: inclination,
      altitudeKm: 400,
      altitudeIsTypical: true,
      anchor,
      label: 'Low Earth orbit',
      explanation: `A low path. The line stays between about ${Math.round(maxLatitudeDeg(inclination))} degrees north and south. The height is typical because the listing does not give one, and the line is a sketch.`,
      detail: 'Earth turns under the orbit, so the next loop sits farther west.',
    }
  }
  return null
}

function lunarSpec(anchor?: { lat: number; lon: number }): OrbitSpec {
  const launch = anchor ?? { lat: 28.6, lon: -80.6 }
  return {
    kind: 'lunar',
    inclinationDeg: 32,
    altitudeKm: 180,
    altitudeIsTypical: true,
    anchor: launch,
    label: 'Lunar transfer',
    explanation: 'A sketch of a path that leaves Earth, bends around the Moon, and can come home. The Moon is much farther than this drawing.',
    detail: 'The line is a sketch of a transfer, not a measured track.',
    lunar: {
      launch: {
        lat: launch.lat,
        lon: launch.lon,
        label: 'Launch',
        detail: 'The path starts at the pad.',
      },
      apex: {
        lat: 5,
        lon: 40,
        label: 'Around the Moon',
        detail: 'The far end stands in for the swing around the Moon. The real Moon is much farther.',
      },
      splashdown: {
        lat: launch.lat,
        lon: wrapLon(launch.lon + 140),
        label: 'Return',
        detail: 'A transfer can come back to Earth. This end point is part of the sketch.',
      },
    },
  }
}

function geometry(
  kind: OrbitKind,
  inclinationDeg: number,
  altitudeKm: number,
  anchor: { lat: number; lon: number },
  lunar: OrbitSpec['lunar'],
): { chains: OrbitChain[]; marks: OrbitMark[]; focus: { lat: number; lon: number }; distance: number } {
  if (kind === 'geo') return geoGeometry(anchor)
  if (kind === 'gto') return gtoGeometry(inclinationDeg, anchor)
  if (kind === 'lunar' && lunar) return lunarGeometry(lunar)
  if (kind === 'escape') return escapeGeometry(anchor)
  if (kind === 'suborbital') return hopGeometry(anchor)
  return closedGeometry(kind, inclinationDeg, altitudeKm, anchor.lon)
}

function closedGeometry(kind: OrbitKind, inclinationDeg: number, altitudeKm: number, nodeLon: number) {
  const orbits = kind === 'sso' || kind === 'polar' ? 1.35 : 2
  const points = circularTrack(inclinationDeg, altitudeKm, nodeLon, orbits, kind === 'polar' || kind === 'sso' ? 220 : 280)
  const north = points.reduce((best, point) => (point.lat > best.lat ? point : best), points[0])
  const south = points.reduce((best, point) => (point.lat < best.lat ? point : best), points[0])
  const reach = Math.round(maxLatitudeDeg(inclinationDeg))
  return {
    chains: [{ id: 'path', color: PATH, points }],
    marks: [
      {
        id: 'north',
        lat: north.lat,
        lon: north.lon,
        radius: 1,
        label: 'North limit',
        detail: `The path turns here. This tilt does not go farther than about ${reach} degrees north.`,
      },
      {
        id: 'south',
        lat: south.lat,
        lon: south.lon,
        radius: 1,
        label: 'South limit',
        detail: `The path turns here. This tilt does not go farther than about ${reach} degrees south.`,
      },
    ],
    focus: { lat: 12, lon: nodeLon },
    distance: 2.9,
  }
}

function geoGeometry(anchor: { lat: number; lon: number }) {
  const points: OrbitPoint[] = []
  for (let index = 0; index <= 180; index += 1) {
    const lon = -180 + (index / 180) * 360
    points.push({ lat: 0, lon, radius: GEO_DRAW_RADIUS })
  }
  return {
    chains: [{ id: 'ring', color: PATH, points }],
    marks: [
      {
        id: 'slot',
        lat: 0,
        lon: anchor.lon,
        radius: GEO_DRAW_RADIUS,
        label: 'One spot',
        detail: 'A satellite on this ring can stay above one longitude. The ring is drawn close to Earth so you can see all of it.',
      },
    ],
    focus: { lat: 0, lon: anchor.lon },
    distance: 3.15,
  }
}

function gtoGeometry(inclinationDeg: number, anchor: { lat: number; lon: number }) {
  const points = transferEllipse(inclinationDeg, anchor.lon, 200)
  const perigee = points[0]
  const apogee = points[Math.floor(points.length / 2)]
  return {
    chains: [{ id: 'transfer', color: PATH, points }],
    marks: [
      {
        id: 'perigee',
        lat: perigee.lat,
        lon: perigee.lon,
        radius: perigee.radius,
        label: 'Low side',
        detail: 'The oval is closest to Earth here, and moving fastest.',
      },
      {
        id: 'apogee',
        lat: apogee.lat,
        lon: apogee.lon,
        radius: apogee.radius,
        label: 'High side',
        detail: 'The oval is farthest from Earth here. A later burn can round the path into the high ring. The drawing is not to scale.',
      },
    ],
    focus: { lat: 0, lon: anchor.lon },
    distance: 3.2,
  }
}

function lunarGeometry(lunar: NonNullable<OrbitSpec['lunar']>) {
  const outbound = spaceArc(lunar.launch, lunar.apex, 56, (t) => 1 + (LUNAR_PEAK_RADIUS - 1) * t)
  const inbound = spaceArc(lunar.apex, lunar.splashdown, 72, (t) => LUNAR_PEAK_RADIUS + (1 - LUNAR_PEAK_RADIUS) * t).slice(1)
  const marks: OrbitMark[] = [
    { id: 'launch', ...lunar.launch, radius: 1 },
    { id: 'apex', ...lunar.apex, radius: LUNAR_PEAK_RADIUS },
    { id: 'splash', ...lunar.splashdown, radius: 1 },
  ]
  return {
    chains: [{ id: 'path', color: PATH, points: [...outbound, ...inbound] }],
    marks,
    focus: { lat: lunar.apex.lat, lon: lunar.apex.lon },
    distance: 4.35,
  }
}

function escapeGeometry(anchor: { lat: number; lon: number }) {
  const end = { lat: Math.max(-40, anchor.lat - 8), lon: wrapLon(anchor.lon + 70) }
  const points = spaceArc(anchor, end, 48, (t) => 1 + 0.7 * t)
  return {
    chains: [{ id: 'departure', color: PATH, points }],
    marks: [
      {
        id: 'outbound',
        lat: end.lat,
        lon: end.lon,
        radius: 1.7,
        label: 'Outbound',
        detail: 'The line leaves Earth. It is a sketch of a departure, not a measured track.',
      },
    ],
    focus: anchor,
    distance: 3.6,
  }
}

function hopGeometry(anchor: { lat: number; lon: number }) {
  const points: OrbitPoint[] = []
  const steps = 40
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    points.push({
      lat: anchor.lat + Math.sin(Math.PI * t) * 0.8,
      lon: anchor.lon + t * 0.4,
      radius: 1 + Math.sin(Math.PI * t) * 0.12,
    })
  }
  return {
    chains: [{ id: 'hop', color: PATH, points }],
    marks: [
      {
        id: 'top',
        lat: anchor.lat + 0.8,
        lon: anchor.lon + 0.2,
        radius: 1.12,
        label: 'Top of the hop',
        detail: 'The flight comes back down near where it started. It does not circle Earth.',
      },
    ],
    focus: anchor,
    distance: 2.7,
  }
}

/** Circular ground track. Longitude includes Earth rotation, so later loops sit farther west. */
export function circularTrack(inclinationDeg: number, altitudeKm: number, nodeLon: number, orbits: number, steps: number): OrbitPoint[] {
  const inc = (inclinationDeg * Math.PI) / 180
  const period = orbitPeriodSec(altitudeKm)
  const mean = (2 * Math.PI) / period
  const node = (nodeLon * Math.PI) / 180
  const total = period * orbits
  const points: OrbitPoint[] = []
  for (let index = 0; index <= steps; index += 1) {
    const t = (total * index) / steps
    const u = mean * t
    const lat = (Math.asin(clamp(Math.sin(inc) * Math.sin(u), -1, 1)) * 180) / Math.PI
    const dlon = Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u))
    const lon = wrapLon(((dlon + node - EARTH_ROT * t) * 180) / Math.PI)
    points.push({ lat, lon, radius: 1 })
  }
  return points
}

function transferEllipse(inclinationDeg: number, nodeLon: number, steps: number): OrbitPoint[] {
  const inc = (inclinationDeg * Math.PI) / 180
  const node = (nodeLon * Math.PI) / 180
  const rp = GTO_PERIGEE_RADIUS
  const ra = GTO_APOGEE_RADIUS
  const e = (ra - rp) / (ra + rp)
  const p = rp * (1 + e)
  const points: OrbitPoint[] = []
  for (let index = 0; index <= steps; index += 1) {
    const nu = (index / steps) * Math.PI * 2
    const radius = p / (1 + e * Math.cos(nu))
    const placed = inclinedPoint(radius, nu, inc, node)
    points.push(placed)
  }
  return points
}

function inclinedPoint(radius: number, nu: number, inc: number, node: number): OrbitPoint {
  const x = radius * (Math.sin(node) * Math.cos(nu) + Math.cos(node) * Math.sin(nu) * Math.cos(inc))
  const z = radius * (Math.cos(node) * Math.cos(nu) - Math.sin(node) * Math.sin(nu) * Math.cos(inc))
  const y = radius * (Math.sin(nu) * Math.sin(inc))
  const lat = (Math.asin(clamp(y / radius, -1, 1)) * 180) / Math.PI
  const lon = wrapLon((Math.atan2(x, z) * 180) / Math.PI)
  return { lat, lon, radius }
}

function spaceArc(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  steps: number,
  radiusAt: (t: number) => number,
): OrbitPoint[] {
  const a = unit(from.lat, from.lon)
  const b = unit(to.lat, to.lon)
  const omega = Math.acos(clamp(dot(a, b), -1, 1))
  const points: OrbitPoint[] = []
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    const direction = slerp(a, b, omega, t)
    points.push({ ...latLon(direction), radius: radiusAt(t) })
  }
  return points
}

function wordsFor(kind: OrbitKind, inclinationDeg: number, altitudeKm: number, typical: boolean): { label: string; explanation: string; detail: string } {
  const reach = Math.round(maxLatitudeDeg(inclinationDeg))
  const height = typical ? `a typical height near ${Math.round(altitudeKm).toLocaleString('en-US')} km` : `about ${Math.round(altitudeKm).toLocaleString('en-US')} km`
  if (kind === 'sso') {
    return {
      label: 'Sun synchronous orbit',
      explanation: `A near polar path. It reaches about ${reach} degrees north and south, tipped a little past a straight polar orbit so the sunlight on the ground can stay steady. The line is a sketch.`,
      detail: 'Each loop sits farther west as Earth turns.',
    }
  }
  if (kind === 'polar') {
    return {
      label: 'Polar orbit',
      explanation: 'The line runs from near the north pole to near the south pole. It is a sketch of that kind of path.',
      detail: 'As Earth turns, a polar path can pass over almost every latitude.',
    }
  }
  if (kind === 'geo') {
    return {
      label: 'Geostationary ring',
      explanation: 'A ring over the equator. The orbit takes one day, so a satellite can stay above one spot. The ring is drawn close to Earth so it fits on the screen.',
      detail: 'The real height is far above the line you see here.',
    }
  }
  if (kind === 'gto') {
    return {
      label: 'Transfer orbit',
      explanation: 'An oval from a low orbit toward the high equatorial ring. The drawing is not to scale.',
      detail: 'The low side is fast. The high side is where a later burn can round the orbit.',
    }
  }
  if (kind === 'lunar') {
    return {
      label: 'Lunar transfer',
      explanation: 'A sketch of a path that leaves Earth and bends around the Moon. The Moon is much farther than this drawing.',
      detail: 'Tap a mark for the launch, the far end, or the return.',
    }
  }
  if (kind === 'escape') {
    return {
      label: 'Left Earth',
      explanation: 'The line leaves Earth. It is a sketch, not a measured track.',
      detail: 'This kind of path does not stay in orbit around Earth.',
    }
  }
  if (kind === 'suborbital') {
    return {
      label: 'Up and down',
      explanation: 'The flight goes up and comes back down. It does not stay in orbit.',
      detail: 'The arc is a sketch near the start of the flight.',
    }
  }
  return {
    label: 'Low Earth orbit',
    explanation: `A low path using ${height}. It stays between about ${reach} degrees north and south. The line is a sketch, not a live position.`,
    detail: 'Earth turns during each loop, so the next loop sits farther west.',
  }
}

function normalizeTilt(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(180, Math.max(0, value))
}

function unit(latDeg: number, lonDeg: number): { x: number; y: number; z: number } {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return { x: Math.cos(lat) * Math.sin(lon), y: Math.sin(lat), z: Math.cos(lat) * Math.cos(lon) }
}

function latLon(vec: { x: number; y: number; z: number }): { lat: number; lon: number } {
  return {
    lat: (Math.asin(clamp(vec.y, -1, 1)) * 180) / Math.PI,
    lon: wrapLon((Math.atan2(vec.x, vec.z) * 180) / Math.PI),
  }
}

function slerp(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  omega: number,
  t: number,
): { x: number; y: number; z: number } {
  if (omega < 1e-4) return a
  const s0 = Math.sin((1 - t) * omega) / Math.sin(omega)
  const s1 = Math.sin(t * omega) / Math.sin(omega)
  return { x: a.x * s0 + b.x * s1, y: a.y * s0 + b.y * s1, z: a.z * s0 + b.z * s1 }
}

function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function wrapLon(lon: number): number {
  let value = lon
  while (value > 180) value -= 360
  while (value < -180) value += 360
  return value
}
