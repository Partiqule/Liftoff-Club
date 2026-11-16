import { describe, expect, it } from 'vitest'
import { dueAlerts } from '@/lib/alerts'
import { observeSlips, publishedReason, slipSentence } from '@/lib/slip'
import { isVisibleTrain, recentStarlinkDesignators } from '@/lib/trains'
import { spotsForLaunch, VIEWING_GROUPS } from '@/lib/viewing-spots'
import { defaultSettings } from '@/lib/settings'
import type { SkyPass } from '@/lib/types'

describe('scrub and slip', () => {
  it('uses only a published reason and keeps a short history', () => {
    const plain = { id: 'a', net: '2026-11-18T01:00:00Z', statusName: 'Go for Launch', statusAbbrev: 'Go', updates: [] }
    expect(publishedReason(plain)).toBeNull()
    expect(slipSentence({ statusName: 'Scrubbed', previousStatus: 'Go for Launch', timeLabel: 'Nov 18, 6:00 PM MT', timeChanged: true, reason: null })).toBe(
      'Status is now Scrubbed. New time: Nov 18, 6:00 PM MT. No reason was published.',
    )
    const noted = { ...plain, failReason: 'Weather.' }
    expect(publishedReason(noted)).toBe('Weather.')
    const first = observeSlips({}, [plain], '2026-11-01T00:00:00Z')
    const second = observeSlips(first, [{ ...plain, net: '2026-11-19T01:00:00Z', statusName: 'Scrubbed', statusAbbrev: 'Scrub', updates: [{ text: 'High winds.' }] }], '2026-11-02T00:00:00Z')
    expect(second.a).toHaveLength(2)
    expect(second.a?.[1]?.reason).toBe('High winds.')
    expect(JSON.stringify(second).toLowerCase()).not.toContain('walk')
  })
})

describe('starlink trains', () => {
  it('keeps recent successful launches and only clear dark passes', () => {
    const now = Date.parse('2026-11-15T00:00:00Z')
    const ids = recentStarlinkDesignators(
      [
        { name: 'Falcon 9 | Starlink Group 10', net: '2026-11-13T00:00:00Z', statusName: 'Launch Successful', launchDesignator: '2026-200' },
        { name: 'Falcon 9 | Starlink Group 9', net: '2026-10-01T00:00:00Z', statusName: 'Launch Successful', launchDesignator: '2026-100' },
        { name: 'Falcon 9 | Starlink Group 11', net: '2026-11-14T00:00:00Z', statusName: 'Launch Failure', launchDesignator: '2026-201' },
      ],
      now,
    )
    expect(ids).toEqual(['2026-200'])
    expect(isVisibleTrain({ kind: 'starlink', illuminatedAtPeak: true, sunElevationAtPeak: -10, maxElevation: 40, grade: 'fair' })).toBe(true)
    expect(isVisibleTrain({ kind: 'starlink', illuminatedAtPeak: false, sunElevationAtPeak: -10, maxElevation: 40, grade: 'poor' })).toBe(false)
    const pass = { id: 'p', kind: 'starlink', start: '2026-11-15T02:00:00Z', peak: '2026-11-15T02:05:00Z', illuminatedAtPeak: true, sunElevationAtPeak: -12, maxElevation: 40, grade: 'fair', gradeReason: 'A dim train.' } as SkyPass
    const alerts = dueAlerts({
      now: Date.parse('2026-11-15T01:30:00Z'),
      settings: {
        ...defaultSettings,
        quietStart: '08:00',
        quietEnd: '09:00',
        location: { label: 'Test', lat: 0, lon: 0, timezone: 'UTC', source: 'search' },
        notifications: { ...defaultSettings.notifications, enabled: true, starlinkTrains: true, includeSky: false },
      },
      briefs: [],
      passes: [pass],
      already: new Set(),
      weather: null,
    })
    expect(alerts[0]?.title).toContain('Approximate')
    expect(alerts[0]?.body.toLowerCase()).not.toContain('walk')
  })
})

describe('viewing spots', () => {
  it('covers the four sites with a source and a map link', () => {
    expect(spotsForLaunch('SLC-40', 'Cape Canaveral, FL').map((spot) => spot.id)).toContain('jetty-park')
    expect(spotsForLaunch('SLC-4E', 'Vandenberg SFB, CA').length).toBeGreaterThan(0)
    expect(spotsForLaunch('Orbital Launch Pad 1', 'SpaceX Starbase, TX').length).toBeGreaterThan(0)
    expect(spotsForLaunch('Pad 0A', 'Wallops Flight Facility').length).toBeGreaterThan(0)
    const spots = VIEWING_GROUPS.flatMap((group) => group.spots)
    expect(spots.every((spot) => spot.sourceUrl.startsWith('https://') && spot.mapsUrl.startsWith('https://'))).toBe(true)
    expect(JSON.stringify(spots).toLowerCase()).not.toContain('walk')
    expect(JSON.stringify(spots)).not.toMatch(/[—–]/)
  })
})
