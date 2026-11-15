import { describe, expect, it } from 'vitest'
import {
  approximateInclination,
  currentPhase,
  elapsedSeconds,
  formatMissionClock,
  groundTrack,
  launchAzimuthDeg,
  missionEvents,
  pointAlong,
  trackProgress,
} from '@/lib/mission'
import type { TimelineEvent } from '@/lib/types'

const events: TimelineEvent[] = [
  { abbrev: 'Liftoff', description: 'Leaves the pad.', offsetSec: 0 },
  { abbrev: 'Max Q', description: 'Hardest push of the air.', offsetSec: 70 },
  { abbrev: 'MECO', description: 'Engines off.', offsetSec: 150 },
]

describe('mission clock and phase', () => {
  it('counts down before liftoff and up after it', () => {
    const net = '2026-11-20T18:00:00Z'
    const before = Date.parse('2026-11-20T17:48:00Z')
    const after = Date.parse('2026-11-20T18:03:12Z')
    expect(elapsedSeconds(net, before)).toBe(-12 * 60)
    expect(formatMissionClock(-12 * 60)).toBe('T− 12:00')
    expect(formatMissionClock((after - Date.parse(net)) / 1000)).toBe('T+ 03:12')
    expect(formatMissionClock(3700)).toBe('T+ 01:01:40')
    expect(currentPhase(events, -30)).toBe('Prelaunch')
    expect(currentPhase(events, 80)).toBe('Max Q')
    expect(currentPhase(events, 200)).toBe('MECO')
    expect(elapsedSeconds(null, before)).toBeNull()
    expect(currentPhase(events, null)).toBe('Waiting on a clock')
  })
})

describe('approximate ground track', () => {
  it('aims due east when inclination matches the pad latitude', () => {
    const azimuth = launchAzimuthDeg(28.5, 28.5)
    expect(azimuth).not.toBeNull()
    expect(azimuth!).toBeCloseTo(90, 0)
  })

  it('aims northeast for a station-like inclination from Florida', () => {
    const azimuth = launchAzimuthDeg(28.5, 51.6)
    expect(azimuth).not.toBeNull()
    expect(azimuth!).toBeGreaterThan(40)
    expect(azimuth!).toBeLessThan(50)
  })

  it('refuses an inclination the pad cannot reach', () => {
    expect(launchAzimuthDeg(28.5, 10)).toBeNull()
  })

  it('starts the path at the pad and moves the dot only after liftoff', () => {
    const track = groundTrack(28.5, -80.5, 90, 8, 2)
    expect(track[0]).toEqual({ lat: 28.5, lon: -80.5 })
    expect(track[track.length - 1].lon).toBeGreaterThan(-80.5)
    expect(pointAlong(track, 0)).toEqual(track[0])
    expect(pointAlong(track, 1)?.lon).toBeCloseTo(track[track.length - 1].lon, 5)
    expect(trackProgress(-10)).toBe(0)
    expect(trackProgress(300)).toBeCloseTo(0.5, 5)
    expect(trackProgress(5000)).toBe(1)
    expect(approximateInclination('Sun-synchronous orbit', 'SSO', 34)).toBeGreaterThan(90)
  })

  it('labels a homemade clock when the listing has no timeline', () => {
    const script = missionEvents({ timeline: [], rocketName: 'Falcon 9', rocketFamily: 'Falcon' })
    expect(script.official).toBe(false)
    expect(script.events.some((event) => event.abbrev === 'Max Q')).toBe(true)
    const official = missionEvents({
      timeline: events,
      rocketName: 'Falcon 9',
      rocketFamily: 'Falcon',
    })
    expect(official.official).toBe(true)
    expect(official.events.map((event) => event.abbrev)).toEqual(['Liftoff', 'Max Q', 'MECO'])
  })
})
