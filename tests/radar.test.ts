import { describe, expect, it } from 'vitest'
import { ISS_FALLBACK } from '@/lib/tle-select'
import {
  RADAR_COPY,
  RADAR_HOME_VIEW,
  DIST_MAX,
  DIST_MIN,
  PITCH_MAX,
  viewLookingAt,
  ascentProgress,
  capRadarObjects,
  dampVelocity,
  doubleTapDistance,
  discNdc,
  distanceForDisc,
  coastView,
  dragFollow,
  easeView,
  FITTED_DISTANCE,
  elementsFromTleBundle,
  gestureIntent,
  focusForTimeZone,
  formatAltitudeKm,
  formatSpeedKms,
  latLonAt,
  launchPhase,
  lerpFixes,
  lerpLon,
  observerDot,
  openingView,
  pathCaption,
  projectRadar,
  radarLaunchFrom,
  wheelDistance,
} from '@/lib/radar'
import { HOME_LIVE_MS, homePhase, pickHomeLaunch } from '@/lib/schedule'
import { fixesAt, orbitTrack, prepareBodies } from '@/lib/radar-propagate'
import { LEGACY_REDIRECTS } from '@/lib/redirects'
import { zoneStatusCopy } from '@/lib/pro/time'
import type { SkyElement } from '@/lib/sky-point'

const iss: SkyElement = {
  noradId: '25544',
  name: 'ISS',
  kind: 'station',
  line1: ISS_FALLBACK.line1,
  line2: ISS_FALLBACK.line2,
}

describe('flight radar', () => {
  it('keeps stations and caps the crowd', () => {
    const bright = Array.from({ length: 40 }, (_, index) => ({
      noradId: String(10000 + index),
      name: `Bright ${index}`,
      kind: 'bright' as const,
      line1: '1 00000U 00000A   00000.00000000  .00000000  00000-0  00000-0 0  0000',
      line2: '2 00000  51.0000 000.0000 0000000  00.0000 000.0000 15.00000000000000',
    }))
    const picked = capRadarObjects([bright[0], iss, ...bright.slice(1)])
    expect(picked[0]?.noradId).toBe('25544')
    expect(picked.filter((item) => item.kind === 'bright')).toHaveLength(24)
    expect(picked).toHaveLength(25)
  })

  it('reads a saved TLE bundle and never invents a town', () => {
    const fromBundle = elementsFromTleBundle({
      iss: { name: 'ISS (ZARYA)', line1: ISS_FALLBACK.line1, line2: ISS_FALLBACK.line2 },
      starlink: [{ name: 'STARLINK-1', line1: '1 71610U 00000A   00000.00000000  .00000000  00000-0  00000-0 0  0000', line2: '2 71610  53.0000 000.0000 0000000  00.0000 000.0000 15.00000000000000' }],
    })
    expect(fromBundle.map((item) => item.kind)).toEqual(['station', 'starlink'])
    expect(observerDot(null)).toBeNull()
    expect(observerDot(undefined)).toBeNull()
    expect(observerDot({ lat: 39.5, lon: -104.8 })).toEqual({ lat: 39.5, lon: -104.8 })
    expect(observerDot({ lat: 120, lon: 0 })).toBeNull()
  })

  it('puts the next pad on an ascent path and faces the Americas', () => {
    const launch = radarLaunchFrom({
      name: 'Example flight',
      padName: 'Pad 39A',
      padLat: 28.6,
      padLon: -80.6,
      orbitName: 'Low Earth orbit',
      orbitAbbrev: 'LEO',
    })
    expect(launch?.track[0]).toEqual({ lat: 28.6, lon: -80.6 })
    expect(launch && launch.track.length).toBeGreaterThan(20)
    expect(radarLaunchFrom({ name: 'No pad', padName: 'Unknown', padLat: null, padLon: null, orbitName: null, orbitAbbrev: null })).toBeNull()
    const front = projectRadar(0, -95, { yaw: (95 * Math.PI) / 180, pitch: 0, distance: 3 }, 200)
    expect(front?.x).toBeCloseTo(100, 0)
    expect(front?.y).toBeCloseTo(100, 0)
    expect(projectRadar(0, 85, { yaw: (95 * Math.PI) / 180, pitch: 0, distance: 3 }, 200)).toBeNull()
    const home = projectRadar(28, -90, RADAR_HOME_VIEW, 400)
    expect(home).not.toBeNull()
    expect(Math.hypot((home?.x ?? 0) - 200, (home?.y ?? 0) - 200)).toBeLessThan(90)
    const aimed = viewLookingAt(34.6, -120.6)
    const pad = projectRadar(34.6, -120.6, aimed, 400)
    expect(Math.hypot((pad?.x ?? 0) - 200, (pad?.y ?? 0) - 200)).toBeLessThan(30)
  })

  it('propagates the station and one orbit from the saved element', () => {
    const bodies = prepareBodies([iss])
    const when = new Date(Date.UTC(2026, 10, 13, 12, 0, 0))
    const fix = fixesAt(bodies, when)[0]
    expect(fix?.lat).toBeGreaterThan(-52)
    expect(fix?.lat).toBeLessThan(52)
    expect(fix?.lon).toBeGreaterThan(-180)
    expect(fix?.lon).toBeLessThanOrEqual(180)
    expect(fix?.altKm).toBeGreaterThan(390)
    expect(fix?.altKm).toBeLessThan(460)
    expect(fix?.speedKms).toBeGreaterThan(7.3)
    expect(fix?.speedKms).toBeLessThan(7.9)
    const track = orbitTrack(bodies[0], when, 48)
    expect(track.length).toBeGreaterThanOrEqual(40)
    expect(Math.abs(track[0].lat - (fix?.lat ?? 0))).toBeLessThan(1)
    const later = fixesAt(bodies, new Date(when.getTime() + 1000))[0]
    const blended = lerpFixes(fix ? [fix] : [], later ? [later] : [], 0.5)[0]
    expect(blended?.altKm).toBeGreaterThan(390)
    expect(lerpLon(179, -179, 0.5)).toBeCloseTo(180, 5)
    expect(ascentProgress(9000, false, 18000)).toBeCloseTo(0.5)
    expect(ascentProgress(9000, true, 18000)).toBe(0)
    expect(formatAltitudeKm(420.4)).toBe('420 km')
    expect(formatSpeedKms(7.66)).toBe('7.66 km/s')
  })

  it('opens on a town, then a time zone, then the next pad', () => {
    const town = openingView({
      place: { lat: 39.7, lon: -104.9 },
      timeZone: 'Europe/Paris',
      launch: { padLat: 28.6, padLon: -80.6 },
    })
    const home = projectRadar(39.7, -104.9, town, 400)
    expect(home).not.toBeNull()
    expect(Math.hypot((home?.x ?? 0) - 200, (home?.y ?? 0) - 200)).toBeLessThan(70)
    const africa = projectRadar(0, 20, town, 400)
    if (africa) expect(Math.hypot(africa.x - 200, africa.y - 200)).toBeGreaterThan(140)
    expect(focusForTimeZone('America/Denver')).toEqual({ lat: 39.7, lon: -104.9 })
    expect(focusForTimeZone('UTC')).toBeNull()
    const denver = openingView({ place: null, timeZone: 'America/Denver', launch: { padLat: 0, padLon: 0 } })
    const west = projectRadar(39.7, -104.9, denver, 400)
    expect(west).not.toBeNull()
    expect(Math.hypot((west?.x ?? 0) - 200, (west?.y ?? 0) - 200)).toBeLessThan(40)
    const pad = openingView({ place: null, timeZone: 'UTC', launch: { padLat: 28.6, padLon: -80.6 } })
    const cape = projectRadar(28.6, -80.6, pad, 400)
    expect(Math.hypot((cape?.x ?? 0) - 200, (cape?.y ?? 0) - 200)).toBeLessThan(50)
    const back = latLonAt(200, 200, town, 400)
    expect(back?.lat).toBeGreaterThan(30)
    expect(back?.lon).toBeLessThan(-90)
  })

  it('drags the point under the finger and keeps the poles upright', () => {
    const view = viewLookingAt(40, -105, 2.8)
    const size = 400
    const start = projectRadar(40, -105, view, size)
    expect(start).not.toBeNull()
    const right = dragFollow(view, { lat: 40, lon: -105 }, (start?.x ?? 0) + 48, start?.y ?? 0, size)
    const movedRight = projectRadar(40, -105, right, size)
    expect((movedRight?.x ?? 0) - (start?.x ?? 0)).toBeGreaterThan(24)
    const down = dragFollow(view, { lat: 40, lon: -105 }, start?.x ?? 0, (start?.y ?? 0) + 40, size)
    const movedDown = projectRadar(40, -105, down, size)
    expect((movedDown?.y ?? 0) - (start?.y ?? 0)).toBeGreaterThan(18)
    let tilted = viewLookingAt(64, 10, 2.8)
    for (let step = 0; step < 24; step += 1) {
      const spot = projectRadar(64, 10, tilted, size)
      if (!spot) break
      tilted = dragFollow(tilted, { lat: 64, lon: 10 }, spot.x, spot.y - 28, size)
    }
    expect(Math.abs(tilted.pitch)).toBeLessThanOrEqual(PITCH_MAX + 1e-6)
    expect(wheelDistance(3, 80, 0)).toBeGreaterThan(3)
    expect(wheelDistance(3, -80, 0)).toBeLessThan(3)
    expect(wheelDistance(3, 5000, 0)).toBe(DIST_MAX)
    expect(wheelDistance(2, -5000, 0)).toBe(DIST_MIN)
    const finger = { x: (start?.x ?? 0) + 48, y: start?.y ?? 0 }
    const stuck = projectRadar(40, -105, right, size)
    expect(Math.hypot((stuck?.x ?? 0) - finger.x, (stuck?.y ?? 0) - finger.y)).toBeLessThan(8)
    const zoomed = dragFollow({ ...view, distance: 2.15 }, { lat: 40, lon: -105 }, start?.x ?? 0, start?.y ?? 0, size)
    const held = projectRadar(40, -105, zoomed, size)
    expect(Math.hypot((held?.x ?? 0) - (start?.x ?? 0), (held?.y ?? 0) - (start?.y ?? 0))).toBeLessThan(8)
    expect(Math.abs(zoomed.pitch)).toBeLessThanOrEqual(PITCH_MAX + 1e-6)
  })

  it('leaves a pole on the first reverse drag and lets a fling settle', () => {
    const size = 400
    const distance = FITTED_DISTANCE
    for (const sign of [1, -1] as const) {
      const view = { yaw: 0.3, pitch: sign * PITCH_MAX, distance }
      const lat = sign * 72
      const spot = projectRadar(lat, 20, view, size)
      expect(spot).not.toBeNull()
      const dy = sign > 0 ? -32 : 32
      const back = dragFollow(view, { lat, lon: 20 }, spot?.x ?? 0, (spot?.y ?? 0) + dy, size)
      expect(sign * (view.pitch - back.pitch)).toBeGreaterThan(0.01)
      expect(Math.abs(back.pitch)).toBeLessThanOrEqual(PITCH_MAX + 1e-9)
      expect(Number.isFinite(back.yaw)).toBe(true)
      expect(Number.isFinite(back.pitch)).toBe(true)
    }
    let pushed = viewLookingAt(15, 0, distance)
    const grab = { lat: 15, lon: 0 }
    for (let step = 0; step < 30; step += 1) {
      const spot = projectRadar(grab.lat, grab.lon, pushed, size)
      if (!spot) break
      pushed = dragFollow(pushed, grab, spot.x, spot.y + 36, size)
    }
    expect(pushed.pitch).toBeGreaterThan(1)
    expect(pushed.pitch).toBeLessThanOrEqual(PITCH_MAX + 1e-6)
    const atPole = projectRadar(grab.lat, grab.lon, pushed, size)
    expect(atPole).not.toBeNull()
    const reversed = dragFollow(pushed, grab, atPole?.x ?? 0, (atPole?.y ?? 0) - 28, size)
    expect(reversed.pitch).toBeLessThan(pushed.pitch)
    expect(Number.isFinite(reversed.yaw)).toBe(true)
    expect(Number.isFinite(reversed.pitch)).toBe(true)

    let view = { yaw: 0.2, pitch: PITCH_MAX - 0.15, distance }
    let velocity = { yaw: 0.001, pitch: 0.01 }
    for (let step = 0; step < 40; step += 1) {
      const coast = coastView(view, velocity, 16)
      view = coast.view
      velocity = coast.velocity
    }
    expect(view.pitch).toBeCloseTo(PITCH_MAX, 5)
    expect(velocity.pitch).toBe(0)
    expect(Number.isFinite(view.yaw)).toBe(true)
    expect(Number.isFinite(view.pitch)).toBe(true)
    const settled = projectRadar(70, 0, view, size)
    expect(settled).not.toBeNull()
    const away = dragFollow(view, { lat: 70, lon: 0 }, settled?.x ?? 0, (settled?.y ?? 0) - 24, size)
    expect(away.pitch).toBeLessThan(view.pitch)
    expect(Number.isFinite(away.pitch)).toBe(true)
  })

  it('keeps the whole disc inside the square at the default distance', () => {
    expect(discNdc(FITTED_DISTANCE)).toBeLessThan(0.8)
    expect(distanceForDisc()).toBeCloseTo(FITTED_DISTANCE, 5)
    const view = { yaw: 0.4, pitch: 0.25, distance: FITTED_DISTANCE }
    let max = 0
    for (let lat = -90; lat <= 90; lat += 6) {
      for (let lon = -180; lon < 180; lon += 6) {
        const spot = projectRadar(lat, lon, view, 400)
        if (!spot) continue
        max = Math.max(max, Math.hypot(spot.x - 200, spot.y - 200))
      }
    }
    expect(max).toBeGreaterThan(120)
    expect(max).toBeLessThan(172)
  })

  it('tells a vertical swipe from a turn, eases, and settles a flick', () => {
    expect(gestureIntent(4, 3, 5)).toBe('undecided')
    expect(gestureIntent(8, 30, 31)).toBe('scroll')
    expect(gestureIntent(30, 8, 31)).toBe('turn')
    const from = viewLookingAt(10, 20, 3)
    const to = viewLookingAt(30, -40, 2.2)
    expect(easeView(from, to, 0)).toMatchObject({ yaw: from.yaw, pitch: from.pitch, distance: from.distance })
    const end = easeView(from, to, 1)
    expect(end.pitch).toBeCloseTo(to.pitch, 5)
    expect(end.distance).toBeCloseTo(to.distance, 5)
    expect(Math.abs(end.yaw - to.yaw)).toBeLessThan(1e-6)
    expect(Math.abs(dampVelocity(0.01, 320))).toBeLessThan(0.005)
    expect(dampVelocity(0.01, 0)).toBe(0.01)
    expect(doubleTapDistance(2.9, 2.85).recenter).toBe(false)
    expect(doubleTapDistance(2.9, 2.85).distance).toBeLessThan(2.9)
    expect(doubleTapDistance(2.1, 2.85).recenter).toBe(true)
  })

  it('drops a flown path and keeps the next launch on the home clock', () => {
    const net = '2026-11-21T12:00:00.000Z'
    const flown = {
      id: 'now',
      name: 'Falcon 9',
      net,
      historical: false,
      statusAbbrev: 'Go',
      statusName: 'Go for Launch',
      featured: true,
    }
    const later = { ...flown, id: 'next', name: 'Next flight', net: '2026-11-22T12:00:00.000Z', featured: false }
    const tMinus = Date.parse(net) - 60 * 60 * 1000
    const liftoff = Date.parse(net) + 30 * 1000
    const after = Date.parse(net) + 15 * 60 * 1000
    expect(HOME_LIVE_MS).toBeLessThan(15 * 60 * 1000)
    expect(homePhase(flown, tMinus)).toBe('upcoming')
    expect(homePhase(flown, liftoff)).toBe('lifting')
    expect(homePhase(flown, after)).toBe('flown')
    expect(launchPhase(flown, liftoff)).toBe('lifting')
    expect(pickHomeLaunch([flown, later], tMinus)?.id).toBe('now')
    expect(pickHomeLaunch([flown, later], liftoff)?.id).toBe('now')
    expect(pickHomeLaunch([flown, later], after)?.id).toBe('next')
    expect(pathCaption({ rocketName: 'Falcon 9', name: 'Falcon 9' }, 'upcoming')).toBe('Falcon 9 path, next launch')
    expect(pathCaption({ rocketName: 'Falcon 9', name: 'Falcon 9' }, 'lifting')).toBe('Falcon 9 path, lifting off')
    expect(pathCaption({ rocketName: 'Falcon 9', name: 'Falcon 9' }, 'flown')).toBeNull()
    expect(pathCaption({ rocketName: 'Falcon 9', name: 'Falcon 9' }, 'upcoming')).not.toMatch(/[—–-]/)
  })

  it('keeps visitor copy free of dashes and the banned word', () => {
    const text = Object.values(RADAR_COPY).join('\n')
    expect(text).not.toMatch(/[—–-]/)
    expect(text.toLowerCase()).not.toContain('walk')
    expect(text).toContain('CelesTrak')
    expect(text).toContain('NASA')
  })
})

describe('legacy paths', () => {
  it('sends old links to the current pages', () => {
    const map = Object.fromEntries(LEGACY_REDIRECTS.map((item) => [item.source, item.destination]))
    expect(map['/tonight']).toBe('/')
    expect(map['/parents']).toBe('/settings')
    expect(map['/for-parents']).toBe('/settings')
    expect(map['/calendar']).toBe('/launches')
    expect(LEGACY_REDIRECTS.every((item) => item.permanent)).toBe(true)
  })
})

describe('zone label', () => {
  it('stays clean when no town is set', () => {
    expect(zoneStatusCopy('UTC', 'auto', false)).toBe('Times follow this device.')
    expect(zoneStatusCopy('UTC', 'auto', false)).not.toContain('(')
    const denver = zoneStatusCopy('America/Denver', 'auto', true)
    expect(denver).toContain('America/Denver')
    expect(denver).toContain('That follows this device.')
    expect(zoneStatusCopy('UTC', 'chosen', true)).toBe('Times use UTC. You chose this zone.')
  })
})
