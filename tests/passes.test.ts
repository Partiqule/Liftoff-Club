import { describe, expect, it } from 'vitest'
import * as satellite from 'satellite.js'
import { compass8, haversineKm, heightPhrase, initialBearingDeg } from '@/lib/geo'
import { gradePass, leadPass } from '@/lib/planner'
import { predictPasses } from '@/lib/predict'
import { sunPosition, satelliteInSunlight } from '@/lib/solar'
import { altitudeKmFromMotion, ISS_FALLBACK, meanMotion, parseTle, selectStarlink, tleFromOmm } from '@/lib/tle-select'
import type { SkyPass } from '@/lib/types'

const ISS = { ...ISS_FALLBACK, kind: 'iss' as const }

describe('pass geometry', () => {
  it('puts an observer under the satellite into a high pass', () => {
    const satrec = satellite.twoline2satrec(ISS.line1, ISS.line2)
    const when = satellite.invjday(satrec.jdsatepoch)
    const pv = satellite.propagate(satrec, when)
    expect(pv?.position && typeof pv.position.x === 'number').toBe(true)
    if (!pv || typeof pv.position === 'boolean') return
    const geo = satellite.eciToGeodetic(pv.position, satellite.gstime(when))
    const observer = {
      lat: satellite.degreesLat(geo.latitude),
      lon: satellite.degreesLong(geo.longitude),
    }
    const passes = predictPasses([ISS], observer, new Date(when.getTime() - 20 * 60 * 1000), new Date(when.getTime() + 20 * 60 * 1000))
    expect(passes.length).toBeGreaterThan(0)
    expect(passes[0].maxElevation).toBeGreaterThan(40)
    expect(passes[0].riseAzimuth).toBeGreaterThanOrEqual(0)
    expect(passes[0].riseAzimuth).toBeLessThan(360)
    expect(Date.parse(passes[0].start)).toBeLessThanOrEqual(Date.parse(passes[0].peak))
    expect(Date.parse(passes[0].peak)).toBeLessThanOrEqual(Date.parse(passes[0].end))
  })

  it('grades a dark high station pass as easy and never calls Starlink great', () => {
    const iss = gradePass({ kind: 'iss', maxElevation: 70, sunElevation: -20, illuminated: true, setsInShadow: false })
    expect(iss.grade).toBe('great')
    const day = gradePass({ kind: 'iss', maxElevation: 80, sunElevation: 30, illuminated: true, setsInShadow: false })
    expect(day.grade).toBe('poor')
    const shadow = gradePass({ kind: 'iss', maxElevation: 80, sunElevation: -20, illuminated: false, setsInShadow: false })
    expect(shadow.grade).toBe('poor')
    const star = gradePass({ kind: 'starlink', maxElevation: 80, sunElevation: -30, illuminated: true, setsInShadow: false })
    expect(star.grade).not.toBe('great')
    expect(star.grade).toBe('good')
  })

  it('describes direction in family words', () => {
    expect(compass8(0)).toBe('north')
    expect(compass8(90)).toBe('east')
    expect(compass8(359)).toBe('north')
    expect(heightPhrase(10)).toMatch(/rooftop/)
    expect(heightPhrase(80)).toMatch(/straight/)
  })

  it('measures a degree of latitude as about 111 km and points north', () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeGreaterThan(110)
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeLessThan(112)
    expect(initialBearingDeg({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(0, 5)
    expect(initialBearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90, 5)
  })

  it('knows summer noon is high and a winter night is dark in Colorado', () => {
    const summer = sunPosition(39.6, -104.9, new Date('2026-06-21T19:00:00Z'))
    const winterNight = sunPosition(39.6, -104.9, new Date('2026-12-21T07:00:00Z'))
    expect(summer.elevation).toBeGreaterThan(60)
    expect(winterNight.elevation).toBeLessThan(0)
  })

  it('treats the night side of Earth as shadow', () => {
    const sun = { x: 1, y: 0, z: 0 }
    expect(satelliteInSunlight({ x: 7000, y: 0, z: 0 }, sun)).toBe(true)
    expect(satelliteInSunlight({ x: -7000, y: 0, z: 0 }, sun)).toBe(false)
    expect(satelliteInSunlight({ x: -1000, y: 8000, z: 0 }, sun)).toBe(true)
  })
})

describe('tle selection', () => {
  it('parses a three-line element and estimates station altitude', () => {
    const text = `${ISS_FALLBACK.name}\n${ISS_FALLBACK.line1}\n${ISS_FALLBACK.line2}\n`
    const parsed = parseTle(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toContain('ISS')
    const alt = altitudeKmFromMotion(meanMotion(parsed[0].line2))
    expect(alt).toBeGreaterThan(390)
    expect(alt).toBeLessThan(450)
  })

  it('caps the starlink sample and keeps more than one orbit plane', () => {
    const base1 = ISS_FALLBACK.line1
    const base2 = '2 44714  53.1442  60.9291 0001605 342.6503  17.4460 15.70016314387562'
    const sats = []
    for (let index = 0; index < 10; index += 1) {
      const norad = String(44714 + index).padStart(5, '0')
      const raan = (index * 40).toFixed(4).padStart(8, ' ')
      const line2 = `2 ${norad}  53.1442 ${raan} 0001605 342.6503  17.4460 15.70016314387562`
      const epochDay = (300 + index).toFixed(8).padStart(12, '0')
      const line1 = `1 ${norad}U 19074B   26${epochDay}  .00099119  00000+0  80297-3 0  9995`
      expect(line2.length).toBeGreaterThan(60)
      sats.push({ name: `STARLINK-${1000 + index}`, line1, line2 })
      void base1
      void base2
    }
    const selected = selectStarlink(sats, 4)
    expect(selected.length).toBeLessThanOrEqual(4)
    expect(selected.length).toBeGreaterThan(1)
  })

  it('rebuilds the station element from a CelesTrak JSON row', () => {
    const row = tleFromOmm({
      OBJECT_NAME: 'ISS (ZARYA)',
      OBJECT_ID: '1998-067A',
      EPOCH: '2026-11-15T08:02:34.132128',
      MEAN_MOTION: 15.49391288,
      ECCENTRICITY: 0.0007375,
      INCLINATION: 51.6322,
      RA_OF_ASC_NODE: 272.1219,
      ARG_OF_PERICENTER: 28.023,
      MEAN_ANOMALY: 332.1155,
      NORAD_CAT_ID: 25544,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 59518,
      BSTAR: 0.00019082,
      MEAN_MOTION_DOT: 0.00010226,
      MEAN_MOTION_DDOT: 0,
      CLASSIFICATION_TYPE: 'U',
      EPHEMERIS_TYPE: 0,
    })
    expect(row?.line1).toBe('1 25544U 98067A   26319.33511727  .00010226  00000+0  19082-3 0  9993')
    expect(row?.line2).toBe('2 25544  51.6322 272.1219 0007375  28.0230 332.1155 15.49391288595180')
  })
})

describe('lead pass', () => {
  it('prefers the station over a dimmer starlink', () => {
    const iss = fakePass({ kind: 'iss', grade: 'good', start: '2026-11-15T02:00:00Z' })
    const star = fakePass({ kind: 'starlink', grade: 'good', start: '2026-11-15T01:00:00Z' })
    expect(leadPass([star, iss], Date.parse('2026-11-14T18:00:00Z'))?.kind).toBe('iss')
  })
})

function fakePass(overrides: Partial<SkyPass> & Pick<SkyPass, 'kind' | 'grade' | 'start'>): SkyPass {
  return {
    id: overrides.start,
    name: overrides.kind === 'iss' ? 'ISS' : 'Starlink 1',
    noradId: '25544',
    peak: overrides.start,
    end: overrides.start,
    riseAzimuth: 300,
    peakAzimuth: 20,
    setAzimuth: 90,
    maxElevation: 50,
    durationSec: 300,
    illuminatedAtPeak: true,
    sunElevationAtPeak: -20,
    setsInShadow: false,
    gradeLabel: 'Should show',
    gradeReason: 'Bright enough.',
    ...overrides,
  }
}
