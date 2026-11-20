import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as satellite from 'satellite.js'
import {
  SKY_HUBBLE_URL,
  SKY_STATIONS_URL,
  SKY_VISUAL_URL,
  assembleSkyElements,
  catalogNotice,
  emptyCatalogNotice,
  formatSavedDay,
  limitStarlinkGroups,
  recentStarlinkDesignators,
  skyGroupUrls,
  staleCatalogNotice,
} from '@/lib/sky-catalog-model'
import { lookNow, surveySky } from '@/lib/sky-propagate'
import {
  SKY_COPY,
  cameraElevation,
  compassNeedsTap,
  domePoint,
  eyeVisible,
  guideAngle,
  guidePhrase,
  readOrientation,
  type SkyElement,
} from '@/lib/sky-point'
import { runtimeCachePath } from '@/lib/runtime-cache'
import { ISS_FALLBACK, type ParsedTle } from '@/lib/tle-select'

function expectPlain(text: string) {
  expect(text.toLowerCase()).not.toContain('walk')
  expect(text).not.toMatch(/[—–-]/)
}

function line(id: string, name: string, motion = '15.49368089'): ParsedTle {
  const cat = id.padStart(5, '0')
  return {
    name,
    line1: `1 ${cat}U 98067A   26324.00000000  .00000000  00000+0  00000+0 0  9990`,
    line2: `2 ${cat}  51.6324 277.2306 0007380  24.2289 335.9045 ${motion}595028`,
  }
}

describe('sky finder words', () => {
  it('keeps the page, the card, and the guide free of dashes and the word walk', () => {
    for (const text of Object.values(SKY_COPY)) expectPlain(text)
    expect(SKY_COPY.thanksgiving).toBe('iPhone app targeted for Thanksgiving.')
    expect(SKY_COPY.figureEight).toContain('figure eight')
    expect(emptyCatalogNotice()).toBe(SKY_COPY.loadFailed)
    expectPlain(emptyCatalogNotice())
    expectPlain(staleCatalogNotice('2026-11-20T18:00:00.000Z'))
    expect(staleCatalogNotice('2026-11-20T18:00:00.000Z')).toContain('Nov 20, 2026')
    expect(formatSavedDay('nope')).toBe('earlier')
    const guide = guidePhrase({
      name: 'ISS',
      heading: 90,
      cameraElevation: 10,
      azimuth: 0,
      elevation: 40,
      above: true,
      riseInMin: null,
      riseAzimuth: null,
    })
    expect(guide).toBe('ISS: turn left and tilt up')
    expectPlain(guide)
    expectPlain(
      guidePhrase({
        name: 'Hubble',
        heading: null,
        cameraElevation: null,
        azimuth: 10,
        elevation: -20,
        above: false,
        riseInMin: 12,
        riseAzimuth: 90,
      }),
    )
    expect(
      guidePhrase({
        name: 'ISS',
        heading: 10,
        cameraElevation: 20,
        azimuth: 12,
        elevation: 22,
        above: true,
        riseInMin: null,
        riseAzimuth: null,
      }),
    ).toBe('ISS is in front of you')
    expect(
      guidePhrase({
        name: 'ISS',
        heading: null,
        cameraElevation: null,
        azimuth: 90,
        elevation: 60,
        above: true,
        riseInMin: null,
        riseAzimuth: null,
      }),
    ).toBe('ISS is marked on the map')
    const files = ['components/sky-finder.tsx', 'components/sky-finder-card.tsx', 'components/sky-dome.tsx', 'lib/sky-point.ts', 'ios/App/App/Info.plist']
    for (const file of files) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      expect(source.toLowerCase()).not.toContain('walk')
      expect(source).not.toMatch(/[—–]/)
    }
  })
})

describe('sky finder pointing', () => {
  it('reads an iPhone heading, an absolute heading, and phone tilt', () => {
    expect(cameraElevation(90, 0)).toBeCloseTo(0, 5)
    expect(cameraElevation(180, 0)).toBeCloseTo(90, 5)
    expect(cameraElevation(0, 0)).toBeCloseTo(-90, 5)
    expect(cameraElevation(0, 90)).toBeCloseTo(0, 5)
    expect(cameraElevation(135, 0)).toBeCloseTo(45, 5)
    const iphone = readOrientation({ alpha: 10, beta: 90, gamma: 0, webkitCompassHeading: 90, webkitCompassAccuracy: 8 })
    expect(iphone.heading).toBe(90)
    expect(iphone.unreliable).toBe(false)
    expect(readOrientation({ alpha: 10, beta: 90, gamma: 0, webkitCompassHeading: 90, webkitCompassAccuracy: -1 }).unreliable).toBe(true)
    expect(readOrientation({ alpha: 10, beta: 90, gamma: 0, webkitCompassHeading: 40, webkitCompassAccuracy: 40 }).unreliable).toBe(true)
    expect(readOrientation({ alpha: 90, beta: 90, gamma: 0, absolute: true }).heading).toBe(270)
    expect(readOrientation({ alpha: 90, beta: 90, gamma: 0, absolute: false }).heading).toBeNull()
    expect(readOrientation({ alpha: 0, beta: null, gamma: null }, true).heading).toBe(0)
    expect(compassNeedsTap(() => 'granted', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true)
    expect(compassNeedsTap(() => 'granted', 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)')).toBe(true)
    expect(compassNeedsTap(() => 'granted', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe(true)
    expect(compassNeedsTap(() => 'granted', 'Mozilla/5.0 (X11; Linux x86_64) Chrome/157.0.0.0')).toBe(false)
    expect(compassNeedsTap(undefined, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(false)
    const angle = guideAngle({
      heading: 90,
      cameraElevation: 10,
      azimuth: 0,
      elevation: 40,
      above: true,
      riseAzimuth: null,
    })
    expect(angle).not.toBeNull()
    expect(guideAngle({ heading: 10, cameraElevation: 20, azimuth: 12, elevation: 22, above: true, riseAzimuth: null })).toBeNull()
  })

  it('maps straight up to the center and north to the top edge', () => {
    expect(domePoint(0, 90)).toEqual({ x: 0.5, y: 0.5 })
    expect(domePoint(0, 0).y).toBeCloseTo(0, 5)
    expect(domePoint(0, 0).x).toBeCloseTo(0.5, 5)
    expect(domePoint(90, 0).x).toBeCloseTo(1, 5)
    expect(domePoint(180, 0).y).toBeCloseTo(1, 5)
    expect(domePoint(270, 0).x).toBeCloseTo(0, 5)
  })

  it('calls a satellite likely visible only when it is sunlit and the sky is dark', () => {
    expect(eyeVisible(true, -10)).toBe(true)
    expect(eyeVisible(true, -6)).toBe(false)
    expect(eyeVisible(true, 20)).toBe(false)
    expect(eyeVisible(false, -20)).toBe(false)
  })
})

describe('sky finder orbits', () => {
  it('names the station, Hubble, and a recent Starlink group without the full fleet file', () => {
    expect(skyGroupUrls()).toEqual([SKY_STATIONS_URL, SKY_VISUAL_URL, SKY_HUBBLE_URL])
    for (const url of skyGroupUrls()) expect(url).not.toMatch(/GROUP=starlink/i)
    const objects = assembleSkyElements({
      stations: [ISS_FALLBACK, line('48274', 'CSS (TIANHE)')],
      hubble: [line('20580', 'HST')],
      starlink: [line('54321', 'STARLINK-3210')],
      visual: [ISS_FALLBACK, line('20580', 'HST'), line('28654', 'NOAA 18')],
    })
    expect(objects.map((object) => object.name)).toEqual(['ISS', 'Tiangong', 'Hubble', 'Starlink 3210', 'NOAA 18'])
    for (const object of objects) expectPlain(object.name)
    expect(objects.filter((object) => object.noradId === '25544')).toHaveLength(1)
    const kept = limitStarlinkGroups([[line('54321', 'STARLINK-3210'), line('11111', 'STARLINK-1', '1.00270000')]])
    expect(kept.map((sat) => sat.name)).toEqual(['STARLINK-3210'])
    const now = Date.parse('2026-11-20T20:00:00Z')
    expect(
      recentStarlinkDesignators(
        [
          { name: 'Starship | Starlink Group 31-2', net: '2026-11-13T22:47:36Z', statusName: 'Launch Successful', designator: '2026-256' },
          { name: 'Falcon 9 | Starlink Group 15-18', net: '2026-10-31T04:04:34Z', statusName: 'Launch Successful', designator: '2026-246' },
          { name: 'Falcon 9 | Starlink', net: '2026-11-18T00:00:00Z', statusName: 'Launch Failure', designator: '2026-300' },
        ],
        now,
      ),
    ).toEqual(['2026-256'])
    expect(catalogNotice({ stations: false, hubble: true, visual: true, starlink: 'ok', hasHubble: true })).toContain('Space stations did not load')
    expectPlain(catalogNotice({ stations: true, hubble: false, visual: true, starlink: 'empty', hasHubble: true }) ?? '')
    const source = readFileSync(new URL('../lib/sky-catalog.ts', import.meta.url), 'utf8')
    expect(source).toContain('liftoff-sky-finder.json')
    expect(source).toContain('runtimeCachePath')
    expect(source).toContain('starlinkLaunchUrl')
    expect(source).not.toContain('.cache')
    expect(source).not.toContain('ISS_FALLBACK')
    expect(source).not.toContain('GROUP=starlink')
    expect(runtimeCachePath('liftoff-sky-finder.json', { VERCEL: '1' }, '/app')).toBe('/tmp/liftoff-sky-finder.json')
  })

  it('puts the station overhead for an observer underneath it', async () => {
    const element: SkyElement = { noradId: '25544', name: 'ISS', kind: 'station', line1: ISS_FALLBACK.line1, line2: ISS_FALLBACK.line2 }
    const satrec = satellite.twoline2satrec(element.line1, element.line2)
    const when = satellite.invjday(satrec.jdsatepoch)
    const pv = satellite.propagate(satrec, when)
    expect(pv?.position && typeof pv.position !== 'boolean').toBe(true)
    if (!pv || typeof pv.position === 'boolean' || !pv.position) return
    const geo = satellite.eciToGeodetic(pv.position, satellite.gstime(when))
    const observer = { lat: satellite.degreesLat(geo.latitude), lon: satellite.degreesLong(geo.longitude) }
    const fixes = await surveySky([element], observer, when, 30)
    expect(fixes).toHaveLength(1)
    expect(fixes[0]?.above).toBe(true)
    expect(fixes[0]?.elevation).toBeGreaterThan(60)
    const far = lookNow(element, { lat: -observer.lat, lon: observer.lon > 0 ? observer.lon - 180 : observer.lon + 180 }, when)
    expect(far?.elevation).toBeLessThan(0)
  })
})

describe('iPhone motion string', () => {
  it('asks for motion in the app plist and leaves the town string in place', () => {
    const plist = readFileSync(new URL('../ios/App/App/Info.plist', import.meta.url), 'utf8')
    expect(plist).toContain('NSMotionUsageDescription')
    expect(plist).toContain('NSLocationWhenInUseUsageDescription')
    expect(plist).toContain('Liftoff Club uses motion sensors so you can point the phone at a satellite and see its name.')
    expectPlain('Liftoff Club uses motion sensors so you can point the phone at a satellite and see its name.')
  })
})
