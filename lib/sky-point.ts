import { compass8 } from '@/lib/geo'

export type SkyKind = 'station' | 'hubble' | 'bright' | 'starlink'

export type SkyElement = {
  noradId: string
  name: string
  kind: SkyKind
  line1: string
  line2: string
}

export type SkyFix = {
  noradId: string
  azimuth: number
  elevation: number
  illuminated: boolean
  visible: boolean
  above: boolean
  riseAt: number | null
  riseAzimuth: number | null
  visibleAtRise: boolean
  litAtRise: boolean
}

/** The sky is dark enough to notice a satellite once the sun is 6 degrees down. */
export function eyeVisible(illuminated: boolean, sunElevation: number): boolean {
  return illuminated && sunElevation < -6
}

export const SKY_COPY = {
  cardKicker: 'Sky finder',
  cardTitle: 'A compass for the sky',
  cardLede: 'Point your phone at the sky. The page names the satellites in that direction.',
  thanksgiving: 'iPhone app targeted for Thanksgiving.',
  cardAction: 'Open the sky finder',
  pageKicker: 'Sky finder',
  pageTitle: 'Sky finder',
  pageLede: 'Point your phone at the sky. The names show what is up there. Tap one and an arrow points the way.',
  checking: 'Checking the orbits.',
  loadFailed: 'CelesTrak did not answer, and there is no saved orbit file yet. This page will not invent a position.',
  needTown: 'The finder needs a town. It will not guess one.',
  tapOne: 'Tap a satellite. An arrow will point the way.',
  aboveTitle: 'Above the horizon',
  soonTitle: 'Coming by soon',
  noneAbove: 'Nothing in this list is above the horizon right now.',
  noneSoon: 'Nothing else in this list rises in the next 30 minutes.',
  domeNote: 'The center is straight up. The edge is the horizon. Words mark north, east, south, and west.',
  compassButton: 'Turn on the compass',
  compassHelp: 'Tap once so this phone can share which way you face.',
  compassDenied: 'The compass stays off. The map still shows what is up.',
  noCompass: 'This screen has no compass. The map still shows what is up.',
  figureEight: 'The compass looks unsure. Move the phone in a figure eight until it settles.',
  likely: 'Likely visible',
  brightSky: 'Sunlit, sky still bright',
  shadow: 'In Earth shadow',
  creditBefore: 'Orbit data from',
  creditName: 'CelesTrak',
} as const

export function visibilityLabel(visible: boolean, illuminated: boolean): string {
  if (visible) return SKY_COPY.likely
  if (illuminated) return SKY_COPY.brightSky
  return SKY_COPY.shadow
}

export function signedAngle(delta: number): number {
  return ((((delta + 180) % 360) + 360) % 360) - 180
}

export function cameraElevation(beta: number | null, gamma: number | null): number | null {
  if (typeof beta !== 'number' || typeof gamma !== 'number') return null
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null
  const up = -Math.cos((beta * Math.PI) / 180) * Math.cos((gamma * Math.PI) / 180)
  return (Math.asin(Math.max(-1, Math.min(1, up))) * 180) / Math.PI
}

export type OrientationSample = {
  alpha: number | null
  beta: number | null
  gamma: number | null
  absolute?: boolean
  webkitCompassHeading?: number | null
  webkitCompassAccuracy?: number | null
}

export type OrientationRead = {
  heading: number | null
  elevation: number | null
  unreliable: boolean
}

/**
 * iPhone reports a true heading on webkitCompassHeading.
 * Other phones report compass heading on absolute alpha, increasing the other way.
 */
export function readOrientation(sample: OrientationSample, fromAbsoluteEvent = false): OrientationRead {
  const elevation = cameraElevation(sample.beta, sample.gamma)
  const webkit = sample.webkitCompassHeading
  if (typeof webkit === 'number' && Number.isFinite(webkit)) {
    const accuracy = sample.webkitCompassAccuracy
    const unreliable = typeof accuracy === 'number' && Number.isFinite(accuracy) && (accuracy < 0 || accuracy > 25)
    return { heading: wrap360(webkit), elevation, unreliable }
  }
  const absolute = fromAbsoluteEvent || sample.absolute === true
  if (absolute && typeof sample.alpha === 'number' && Number.isFinite(sample.alpha)) {
    return { heading: wrap360(360 - sample.alpha), elevation, unreliable: false }
  }
  return { heading: null, elevation, unreliable: true }
}

export function guidePhrase(input: {
  name: string
  heading: number | null
  cameraElevation: number | null
  azimuth: number
  elevation: number
  above: boolean
  riseInMin: number | null
  riseAzimuth: number | null
}): string {
  if (!input.above) {
    const when = input.riseInMin == null ? 'soon' : input.riseInMin <= 1 ? 'within a minute' : `in ${input.riseInMin} min`
    const face = compass8(input.riseAzimuth ?? input.azimuth)
    const turn = turnWord(input.heading, input.riseAzimuth ?? input.azimuth)
    const base = `${input.name} rises ${when} toward the ${face}`
    return turn ? `${base}. ${capitalize(turn)}` : `${base}.`
  }
  const turn = turnWord(input.heading, input.azimuth)
  const tilt = tiltWord(input.cameraElevation, input.elevation)
  const parts = [turn, tilt].filter((part): part is string => Boolean(part))
  if (parts.length === 0) {
    if (input.heading == null && input.cameraElevation == null) return `${input.name} is marked on the map`
    return `${input.name} is in front of you`
  }
  if (parts.length === 1) return `${input.name}: ${parts[0]}`
  return `${input.name}: ${parts[0]} and ${parts[1]}`
}

/** Degrees clockwise from up. Null when no turn or tilt is needed. */
export function guideAngle(input: {
  heading: number | null
  cameraElevation: number | null
  azimuth: number
  elevation: number
  above: boolean
  riseAzimuth: number | null
}): number | null {
  if (input.heading == null) return null
  const targetAz = input.above ? input.azimuth : (input.riseAzimuth ?? input.azimuth)
  const turn = signedAngle(targetAz - input.heading)
  if (!input.above) {
    if (Math.abs(turn) < 18) return null
    return turn > 0 ? 90 : -90
  }
  const tilt = input.cameraElevation != null ? input.elevation - input.cameraElevation : 0
  if (Math.hypot(turn, tilt) < 14) return null
  return (Math.atan2(turn, tilt) * 180) / Math.PI
}

/** Unit box. Center is straight up. The top edge is north on the horizon. */
export function domePoint(azimuth: number, elevation: number): { x: number; y: number } {
  const el = Math.max(0, Math.min(90, elevation))
  const radius = ((90 - el) / 90) * 0.5
  const rad = (wrap360(azimuth) * Math.PI) / 180
  return {
    x: 0.5 + radius * Math.sin(rad),
    y: 0.5 - radius * Math.cos(rad),
  }
}

/** iOS Safari only reveals the compass after a tap. Desktop Chrome may expose the same function and still needs no tap. */
export function compassNeedsTap(requestPermission: unknown, userAgent: string, platform = '', maxTouchPoints = 0): boolean {
  if (typeof requestPermission !== 'function') return false
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true
  return platform === 'MacIntel' && maxTouchPoints > 1
}

export function riseMinutes(riseAt: number | null, now: number): number | null {
  if (riseAt == null) return null
  return Math.max(1, Math.round((riseAt - now) / 60_000))
}

function turnWord(heading: number | null, azimuth: number): string | null {
  if (heading == null) return null
  const turn = signedAngle(azimuth - heading)
  if (turn > 18) return 'turn right'
  if (turn < -18) return 'turn left'
  return null
}

function tiltWord(cameraEl: number | null, elevation: number): string | null {
  if (cameraEl == null) return null
  const tilt = elevation - cameraEl
  if (tilt > 12) return 'tilt up'
  if (tilt < -12) return 'tilt down'
  return null
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function wrap360(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}
