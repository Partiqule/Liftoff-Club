import { describe, expect, it } from 'vitest'
import { PRO_COPY } from '@/lib/pro/copy'
import { accessNote } from '@/lib/pro/access'
import { companyBrief, constellationBrief, talkStaysInside, talkTrack } from '@/lib/pro/brief'
import { filterManifest, isRideshareLaunch, manifestCsv } from '@/lib/pro/manifest-intel'
import { trackerRows, type TrackerSource } from '@/lib/pro/tracker'
import {
  addTarget,
  changesSince,
  emptyStore,
  evaluateAlerts,
  isScrubOrSlip,
  launchesForTargets,
  markSeen,
  nextForTarget,
  sanitizeStore,
  snapshotTarget,
  targetKey,
  type WatchTarget,
} from '@/lib/pro/watch'
import { CONSTELLATIONS } from '@/lib/constellation-data'
import { makeLaunch } from './fixtures'

const starlink = CONSTELLATIONS.find((item) => item.id === 'starlink')
const refs = CONSTELLATIONS.map((item) => ({ id: item.id, name: item.name, pattern: item.launchPattern }))

function source(partial: Partial<TrackerSource> = {}): TrackerSource {
  return {
    id: 'starlink',
    name: 'Starlink',
    operator: 'SpaceX',
    companySlug: 'spacex',
    pattern: 'starlink',
    group: 'starlink',
    inOrbit: 10,
    launchesThisYear: 2,
    latestLaunchDate: '2026-03-01',
    catalogAsOf: '2026-11-15',
    authorized: starlink?.satellites ?? null,
    capacity: null,
    ...partial,
  }
}

describe('pro copy', () => {
  it('names both desks without claiming a partnership, and skips walk and dashes', () => {
    const blob = JSON.stringify(PRO_COPY)
    expect(blob).toMatch(/Hubble Network/)
    expect(blob).toMatch(/Starlink/)
    expect(blob).toMatch(/not a partner/)
    expect(blob).toMatch(/not endorsed/)
    expect(blob.toLowerCase()).not.toMatch(/walk/)
    expect(blob).not.toMatch(/[—–]/)
  })
})

describe('pro tracker', () => {
  it('cites every number and leaves a missing capacity blank', () => {
    const [row] = trackerRows([source()], [makeLaunch()], '2026-11-15', Date.parse('2026-11-01T00:00:00Z'))
    const cells = [row.inOrbit, row.launchesThisYear, row.authorized, row.capacity, row.lastLaunch, row.nextLaunch, row.ai]
    for (const cell of cells) {
      if (/\d/.test(cell.text)) {
        expect(cell.sourceUrl).toMatch(/^https:\/\//)
        expect(cell.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
    expect(row.capacity.text).toBe('No public figure yet')
    expect(row.authorized.text).toContain('15,000')
    expect(row.authorized.sourceUrl).toContain('fcc.gov')
    expect(row.ai.text).toBe('No public note yet')
  })

  it('does not invent a catalog count when the file did not answer', () => {
    const [row] = trackerRows([source({ inOrbit: null, launchesThisYear: null, latestLaunchDate: null, catalogAsOf: null })], [], null)
    expect(row.inOrbit.text).toBe('No public figure yet')
    expect(row.inOrbit.sort).toBeNull()
  })
})

describe('pro manifest', () => {
  it('keeps rideshare missions the listing actually names', () => {
    const transporter = makeLaunch({ id: 't', name: 'Falcon 9 Block 5 | Transporter 12', missionName: 'Transporter 12' })
    const plain = makeLaunch({ id: 's', name: 'Falcon 9 Block 5 | Starlink Group 10-1' })
    expect(isRideshareLaunch(transporter)).toBe(true)
    expect(isRideshareLaunch(plain)).toBe(false)
    expect(filterManifest([transporter, plain], { company: '', rideshare: true, orbit: '', site: '' }).map((item) => item.id)).toEqual(['t'])
    expect(filterManifest([transporter, plain], { company: 'starlink', rideshare: false, orbit: '', site: '' })).toHaveLength(1)
  })

  it('exports a csv that quotes commas', () => {
    const csv = manifestCsv([makeLaunch({ name: 'Falcon 9, test' })])
    expect(csv.split('\n')[0]).toContain('Launch')
    expect(csv).toContain('"Falcon 9, test"')
  })
})

describe('pro watchlist and alerts', () => {
  it('stores a target and notices a moved clock, a scrub, and a new manifest name', () => {
    const target: WatchTarget = { kind: 'constellation', id: 'starlink', label: 'Starlink', addedAt: '2026-11-01T00:00:00Z' }
    const store = addTarget(emptyStore(), target)
    expect(sanitizeStore(store).targets).toHaveLength(1)
    const launch = makeLaunch({ statusName: 'Go for Launch', statusAbbrev: 'Go' })
    const seen = snapshotTarget(target, [launch], refs)
    const moved = makeLaunch({ net: '2026-11-19T03:14:00Z', statusName: 'Scrubbed', statusAbbrev: 'Scrub' })
    const next = nextForTarget(target, [moved], refs, Date.parse('2026-11-01T00:00:00Z'))
    const changes = changesSince(seen, next)
    expect(changes.map((item) => item.kind)).toEqual(expect.arrayContaining(['slip', 'scrub']))
    expect(isScrubOrSlip('Go for Launch', 'Go')).toBe(false)
    const withSeen = markSeen(store, { [targetKey(target)]: { ...seen, manifest: ['Older payload'] } })
    const manifestChanges = changesSince(withSeen.seen[targetKey(target)], next)
    expect(manifestChanges.some((item) => item.kind === 'manifest')).toBe(true)
  })

  it('lists company launches and builds a watched calendar set', () => {
    const launch = makeLaunch()
    const store = addTarget(emptyStore(), { kind: 'company', id: 'spacex', label: 'SpaceX', addedAt: '2026-11-01T00:00:00Z' })
    const ruled = { ...store, rules: [{ id: 'rule-1', kind: 'company-launch' as const, companyId: 'spacex', enabled: true }] }
    const hits = evaluateAlerts(ruled, [launch], refs, Date.parse('2026-11-01T00:00:00Z'))
    expect(hits.length).toBeGreaterThan(0)
    const watched = launchesForTargets([launch, makeLaunch({ id: 'other', name: 'Electron | Other', provider: { ...launch.provider, name: 'Rocket Lab', companyId: 'rocket-lab' }, manifest: [] })], store.targets, refs, Date.parse('2026-11-01T00:00:00Z'))
    expect(watched.map((item) => item.id)).toEqual(['launch-1'])
  })
})

describe('pro brief', () => {
  it('builds a talk track only from cited lines', () => {
    const brief = constellationBrief(source(), [makeLaunch()], '2026-11-15', Date.parse('2026-11-01T00:00:00Z'))
    expect(brief.facts.some((fact) => fact.text.includes('15,000') && fact.sourceUrl.includes('fcc.gov'))).toBe(true)
    expect(brief.gaps.some((gap) => gap.toLowerCase().includes('capacity'))).toBe(true)
    expect(talkStaysInside(brief.talk, brief.facts)).toBe(true)
    expect(talkStaysInside(['The fleet is 999 satellites.'], brief.facts)).toBe(false)
    expect(talkTrack([])[0]).toMatch(/No sourced figure/)
    const company = companyBrief('SpaceX', 'spacex', [source()], [makeLaunch()], '2026-11-15', Date.parse('2026-11-01T00:00:00Z'))
    expect(company.facts.some((fact) => fact.heading === 'Upcoming on the public board')).toBe(true)
  })
})

describe('pro access note', () => {
  it('composes a request and does not pretend it was stored', () => {
    const note = accessNote({ name: 'Ada', email: 'ada@example.com', organization: 'Example Satellites', desk: 'company', note: 'Please write when the pilot opens.' })
    expect(note).toMatch(/was not saved/)
    expect(note).toMatch(/Pilot pricing on request/)
    expect(note).toMatch(/Company desk/)
  })
})
