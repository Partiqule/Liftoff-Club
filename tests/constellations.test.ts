import { describe, expect, it } from 'vitest'
import { citedProblems } from '@/lib/cited'
import { CONSTELLATIONS } from '@/lib/constellation-data'
import { countAheadThisYear, keepKnownCounts, tallyCatalog, type CatalogObject, type ConstellationCounts } from '@/lib/constellation-tally'
import { aiNotesForCompany, aiNotesForLaunch } from '@/lib/ai-orbit'

const pay = (partial: Partial<CatalogObject>): CatalogObject => ({
  objectType: 'PAY',
  objectId: '2026-010A',
  launchDate: '2026-01-02',
  decayDate: null,
  ...partial,
})

describe('catalog counts', () => {
  it('counts payloads in orbit and ignores debris and decayed satellites', () => {
    const counts = tallyCatalog(
      [
        pay({ objectId: '2026-010A' }),
        pay({ objectId: '2026-010B' }),
        pay({ objectId: '2024-001A', launchDate: '2024-03-01', decayDate: '2025-01-01' }),
        { objectType: 'R/B', objectId: '2026-010C', launchDate: '2026-01-02', decayDate: null },
        { objectType: 'DEB', objectId: '2026-010D', launchDate: '2026-01-02', decayDate: null },
      ],
      2026,
    )
    expect(counts.launched).toBe(3)
    expect(counts.inOrbit).toBe(2)
    expect(counts.launchesThisYear).toBe(1)
    expect(counts.latestLaunchDate).toBe('2026-01-02')
  })

  it('counts two launches on the same day as two launches', () => {
    const counts = tallyCatalog(
      [
        pay({ objectId: '2026-010A', launchDate: '2026-04-01' }),
        pay({ objectId: '2026-011A', launchDate: '2026-04-01' }),
      ],
      2026,
    )
    expect(counts.launchesThisYear).toBe(2)
  })

  it('counts only future board launches in the named constellation', () => {
    const launches = [
      { name: 'Falcon 9 | Starlink Group 10', missionName: null, rocketName: 'Falcon 9', net: '2026-12-01T00:00:00Z' },
      { name: 'Falcon 9 | Starlink Group 9', missionName: null, rocketName: 'Falcon 9', net: '2026-01-01T00:00:00Z' },
      { name: 'Falcon 9 | NROL-1', missionName: null, rocketName: 'Falcon 9', net: '2026-12-01T00:00:00Z' },
    ]
    expect(countAheadThisYear(launches, /starlink/i, 2026, Date.parse('2026-06-01T00:00:00Z'))).toBe(1)
  })
})

describe('a missed catalog', () => {
  const saved: ConstellationCounts = { launched: 100, inOrbit: 90, launchesThisYear: 4, latestLaunchDate: '2026-11-01' }

  it('keeps the last good tally and does not turn a miss into zero', () => {
    const next = keepKnownCounts({ starlink: saved, oneweb: saved }, { starlink: null, kuiper: { launched: 8, inOrbit: 8, launchesThisYear: 2, latestLaunchDate: '2026-10-01' } })
    expect(next.starlink).toEqual(saved)
    expect(next.oneweb).toEqual(saved)
    expect(next.kuiper?.inOrbit).toBe(8)
    expect(Object.values(next).some((counts) => counts.inOrbit === 0 && counts.launched === 0)).toBe(false)
  })
})

describe('curated figures', () => {
  it('requires a source and a date, and leaves uncited capacity blank', () => {
    expect(citedProblems({ label: 'Plan', value: 10, unit: 'satellites', sourceUrl: 'http://example.com', sourceTitle: 'Example', asOf: '2026-01-01', compareToInOrbit: false, note: null })).toContain(
      'source must be https',
    )
    for (const profile of CONSTELLATIONS) {
      expect(profile.satellites === null || citedProblems(profile.satellites).length === 0).toBe(true)
      expect(profile.bandwidth === null || citedProblems(profile.bandwidth).length === 0).toBe(true)
    }
    expect(CONSTELLATIONS.find((profile) => profile.id === 'starlink')?.bandwidth).toBeNull()
    expect(CONSTELLATIONS.find((profile) => profile.id === 'starlink')?.satellites?.compareToInOrbit).toBe(false)
    expect(CONSTELLATIONS.find((profile) => profile.id === 'kuiper')?.satellites?.value).toBe(3232)
  })
})

describe('AI in orbit notes', () => {
  it('tags the sourced mission and the agency, and skips an ordinary launch', () => {
    expect(aiNotesForCompany('european-space-agency').map((note) => note.id)).toEqual(['phisat-2'])
    expect(aiNotesForCompany('spacex')).toHaveLength(0)
    expect(aiNotesForLaunch({ name: 'Falcon 9 | PhiSat-2', missionName: null }).map((note) => note.id)).toEqual(['phisat-2'])
    expect(aiNotesForLaunch({ name: 'Falcon 9 | Starlink Group 10', missionName: 'Communications' })).toHaveLength(0)
    for (const note of aiNotesForCompany('european-space-agency')) {
      expect(note.sourceUrl.startsWith('https://')).toBe(true)
      expect(note.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
