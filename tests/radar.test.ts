import { describe, expect, it } from 'vitest'
import { ISS_FALLBACK } from '@/lib/tle-select'
import {
  RADAR_COPY,
  RADAR_HOME_VIEW,
  viewLookingAt,
  ascentProgress,
  capRadarObjects,
  elementsFromTleBundle,
  formatAltitudeKm,
  formatSpeedKms,
  lerpFixes,
  lerpLon,
  observerDot,
  projectRadar,
  radarLaunchFrom,
} from '@/lib/radar'
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
