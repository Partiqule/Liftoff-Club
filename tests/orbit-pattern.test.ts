import { describe, expect, it } from 'vitest'
import { HISTORY, assembleHistory, historyWhen, isNotableCompleted } from '@/lib/history'
import { PATH_COPY } from '@/components/path-globe'
import {
  GEO_DRAW_RADIUS,
  ORBIT_UI,
  buildOrbitPattern,
  circularTrack,
  formatHeight,
  formatTilt,
  maxLatitudeDeg,
  orbitSpecForLaunch,
  westwardStepDeg,
} from '@/lib/orbit-pattern'
import { openingView, projectRadar } from '@/lib/radar'
import { STARSHIP_CHANGES, starshipChangeFor, starshipFlightNumber } from '@/lib/starship-changes'
import { makeLaunch } from './fixtures'

describe('orbit pattern helpers', () => {
  it('keeps a low orbit inside its tilt and shifts the next loop west', () => {
    const low = circularTrack(51.6, 420, -80, 2, 360)
    const high = circularTrack(51.6, 2000, -80, 2, 360)
    expect(Math.max(...low.map((point) => point.lat))).toBeCloseTo(maxLatitudeDeg(51.6), 0)
    expect(Math.min(...low.map((point) => point.lat))).toBeCloseTo(-maxLatitudeDeg(51.6), 0)
    const lowStep = nodeStep(low)
    const highStep = nodeStep(high)
    expect(lowStep).toBeLessThan(-15)
    expect(highStep).toBeLessThan(lowStep)
    expect(westwardStepDeg(2000)).toBeGreaterThan(westwardStepDeg(420))
  })

  it('draws a sun synchronous path near the poles and a geostationary ring off the surface', () => {
    const sun = buildOrbitPattern({ kind: 'sso', inclinationDeg: 97.4, altitudeKm: 800, altitudeIsTypical: true })
    const lats = sun.chains[0].points.map((point) => point.lat)
    expect(Math.max(...lats)).toBeGreaterThan(80)
    expect(Math.max(...lats)).toBeLessThan(90)
    expect(sun.label).toMatch(/Sun synchronous/i)
    const ring = buildOrbitPattern({ kind: 'geo', inclinationDeg: 0, altitudeKm: 35786 })
    expect(ring.chains[0].points.every((point) => Math.abs(point.lat) < 0.01)).toBe(true)
    expect(ring.chains[0].points.every((point) => point.radius === GEO_DRAW_RADIUS)).toBe(true)
    expect(formatHeight(ring)).toBe('35,786 km')
    expect(formatTilt(ring)).toBe('0 deg')
    expect(formatHeight(sun)).toMatch(/^About /)
  })

  it('sketches Apollo 13 as a free return behind a labeled Moon', () => {
    const mission = HISTORY.find((item) => item.id === 'apollo-13')
    expect(mission?.orbit?.kind).toBe('lunar')
    const pattern = buildOrbitPattern(mission!.orbit!)
    const line = pattern.chains.flatMap((chain) => chain.points)
    const moon = pattern.marks.find((mark) => mark.id === 'moon')
    const tli = pattern.marks.find((mark) => mark.id === 'tli')
    const parking = pattern.marks.find((mark) => mark.id === 'parking')
    const tank = pattern.marks.find((mark) => mark.id === 'tank')
    expect(moon?.label).toBe('Moon')
    expect(moon?.shape).toBe('moon')
    expect(tli?.detail).toContain('2 hours 35 minutes 46 seconds')
    expect(parking?.detail).toContain('100.2 by 98.0 nautical miles')
    expect(parking?.detail).toContain('one and a half')
    expect(tank?.detail).toContain('55 hours 54 minutes 53 seconds')
    expect(Math.min(...line.map((point) => point.radius))).toBeLessThan(1.35)
    expect(Math.max(...line.map((point) => point.radius))).toBeGreaterThan((moon?.radius ?? 0) - 0.05)
    const view = openingView({ place: null, timeZone: null, launch: null, focus: pattern.focus, distance: pattern.distance })
    const spot = projectRadar(moon!.lat, moon!.lon, view, 400, moon!.radius)
    const far = line.reduce((best, point) => (point.radius > best.radius ? point : best), line[0])
    const farSpot = projectRadar(far.lat, far.lon, view, 400, far.radius)
    expect(spot).not.toBeNull()
    expect(farSpot).not.toBeNull()
    for (const place of [spot!, farSpot!]) {
      expect(place.x).toBeGreaterThan(24)
      expect(place.x).toBeLessThan(376)
      expect(place.y).toBeGreaterThan(24)
      expect(place.y).toBeLessThan(376)
    }
    expect(pattern.label).toBe('Free return')
    expect(pattern.explanation.toLowerCase()).toContain('not to scale')
    expect(formatTilt(pattern)).toBe('Sketch')
    expect(formatHeight(pattern)).toBe('Sketch')
  })

  it('maps listing words onto a pattern and keeps the copy plain', () => {
    expect(orbitSpecForLaunch(makeLaunch({ orbitName: 'Sun-synchronous orbit', orbitAbbrev: 'SSO' }))?.kind).toBe('sso')
    expect(orbitSpecForLaunch(makeLaunch({ orbitName: 'Geostationary', orbitAbbrev: 'GEO' }))?.kind).toBe('geo')
    expect(orbitSpecForLaunch(makeLaunch({ orbitName: 'Geostationary Transfer', orbitAbbrev: 'GTO' }))?.kind).toBe('gto')
    expect(orbitSpecForLaunch(makeLaunch({ name: 'Falcon 9 | Crew', orbitName: 'Low Earth Orbit', orbitAbbrev: 'ISS' }))?.inclinationDeg).toBe(51.6)
    expect(orbitSpecForLaunch(makeLaunch({ orbitName: null, orbitAbbrev: null, name: 'Weather' }))).toBeNull()
    const blob = [
      ...Object.values(ORBIT_UI),
      ...Object.values(PATH_COPY),
      ...HISTORY.flatMap((item) => [item.kid, item.adult, item.orbit?.explanation ?? '', item.orbit?.detail ?? '']),
      ...STARSHIP_CHANGES.map((item) => item.note),
    ].join('\n')
    expect(blob.toLowerCase()).not.toContain('walk')
    expect(blob).not.toMatch(/[—–]/)
  })
})

describe('starship what changed', () => {
  it('reads a flight number and refuses an unknown flight', () => {
    expect(starshipFlightNumber('Starship | Starlink Group 31-2 (Starship Flight 15)')).toBe(15)
    expect(starshipFlightNumber('Starship | Flight 8')).toBe(8)
    expect(starshipFlightNumber('Falcon 9 | Starlink Group 10-1')).toBeNull()
    expect(starshipChangeFor('Starship Flight 15')?.sourceUrl).toMatch(/^https:\/\/www\.spacex\.com\//)
    expect(starshipChangeFor('Starship Flight 99')).toBeNull()
    expect(starshipChangeFor('Starship Flight 16')).toBeNull()
    expect(STARSHIP_CHANGES.map((item) => item.flight)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(STARSHIP_CHANGES.every((item) => item.sourceUrl.startsWith('https://') && item.note.length > 40)).toBe(true)
  })
})

describe('history from the board', () => {
  it('adds a completed Starship flight and leaves a future listing on the board', () => {
    const now = Date.parse('2026-11-21T12:00:00Z')
    const flown = makeLaunch({
      id: 'flight-15',
      name: 'Starship | Starlink Group 31-2 (Starship Flight 15)',
      rocketName: 'Starship',
      net: '2026-11-13T22:47:36Z',
      windowEnd: '2026-11-13T22:47:36Z',
      statusName: 'Launch Successful',
      statusAbbrev: 'Success',
      historical: true,
      orbitName: 'Low Earth Orbit',
      orbitAbbrev: 'LEO',
      infoUrl: 'https://www.spacex.com/launches/starship-flight-15/',
    })
    const upcoming = makeLaunch({ id: 'soon', name: 'Falcon 9 | Starlink', net: '2026-12-01T00:00:00Z', windowEnd: '2026-12-01T00:00:00Z' })
    const pastPlain = makeLaunch({
      id: 'old',
      name: 'Falcon 9 | Starlink Group 10-9',
      net: '2026-11-01T00:00:00Z',
      statusName: 'Launch Successful',
      statusAbbrev: 'Success',
      historical: false,
    })
    expect(isNotableCompleted(flown, now)).toBe(true)
    expect(isNotableCompleted(upcoming, now)).toBe(false)
    expect(isNotableCompleted(pastPlain, now)).toBe(false)
    const missions = assembleHistory([flown, upcoming, pastPlain], now, [
      { match: /flight 15/i, kid: 'A ship flew, released satellites, and the tower caught it on the way home.' },
    ])
    expect(missions[0].id).toBe('apollo-11')
    expect(missions.some((item) => item.id === 'apollo-13')).toBe(true)
    const added = missions.find((item) => item.id === 'board-flight-15')
    expect(added?.change?.flight).toBe(15)
    expect(added?.when).toBe(historyWhen(flown.net))
    expect(added?.kid).toMatch(/tower caught/)
    expect(added?.orbit?.kind).toBe('leo')
    expect(added?.sourceUrl).toBe(flown.infoUrl)
    expect(missions.some((item) => item.id === 'board-soon' || item.id === 'board-old')).toBe(false)
  })
})

function nodeStep(points: { lat: number; lon: number }[]): number {
  const nodes: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    if (points[index - 1].lat <= 0 && points[index].lat > 0) nodes.push(points[index].lon)
  }
  expect(nodes.length).toBeGreaterThanOrEqual(2)
  let delta = nodes[1] - nodes[0]
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta
}
