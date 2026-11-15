import { describe, expect, it } from 'vitest'
import { PRO_COPY } from '@/lib/pro/copy'
import { signupCsv, signupNote, validateSignup } from '@/lib/pro/signups'
import { companyBrief, constellationBrief, talkStaysInside, talkTrack } from '@/lib/pro/brief'
import { filterManifest, isRideshareLaunch, manifestCsv, manifestFacts, rideshareSlot } from '@/lib/pro/manifest-intel'
import { CATALOG_LAG_NOTE, isFlownSuccess, monthlyCounts, summarizeHistory, type HistoryLaunch } from '@/lib/pro/history'
import { formatLaunchWhen, formatMountain } from '@/lib/pro/time'
import { trackerRows, type TrackerHistory, type TrackerSource } from '@/lib/pro/tracker'
import {
  addTarget,
  buildFeed,
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
  upsertRule,
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
  it('describes both desks without naming a company, and skips walk and dashes', () => {
    const blob = JSON.stringify(PRO_COPY)
    expect(blob).toMatch(/For teams at small satellite companies/)
    expect(blob).toMatch(/For people who sell constellation service/)
    expect(blob).toMatch(/Independent project/)
    expect(blob).not.toMatch(/Hubble|Starlink|SpaceX/)
    expect(blob.toLowerCase()).not.toMatch(/walk/)
    expect(blob).not.toMatch(/[—–]/)
  })
})

function flown(partial: Partial<HistoryLaunch>): HistoryLaunch {
  return {
    id: partial.id ?? 'flight',
    name: partial.name ?? 'Starship | Starlink Group 31-2 (Starship Flight 15)',
    missionName: partial.missionName ?? null,
    net: partial.net ?? '2026-11-13T22:47:36Z',
    statusName: partial.statusName ?? 'Launch Successful',
    statusAbbrev: partial.statusAbbrev ?? 'Success',
  }
}

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
    expect(row.launchesThisYear.text).toBe('No public figure yet')
    expect(row.lastLaunch.text).toBe('No public figure yet')
  })

  it('counts Starship flights that carried Starlink and notes when the catalog is behind', () => {
    const flights = [
      flown({ id: 'f15', name: 'Starship | Starlink Group 31-2 (Starship Flight 15)', net: '2026-11-13T22:47:36Z' }),
      flown({ id: 'f14', name: 'Starship | Starlink Group 31-1 (Starship Flight 14)', net: '2026-10-15T00:00:00Z' }),
      flown({ id: 'f9', name: 'Falcon 9 Block 5 | Starlink Group 6-1', net: '2026-01-04T06:48:10Z' }),
      flown({ id: 'old', name: 'Falcon 9 Block 5 | Starlink Group 2-1', net: '2025-12-01T00:00:00Z' }),
      flown({ id: 'fail', name: 'Falcon 9 Block 5 | Starlink Group 9-9', net: '2026-02-01T00:00:00Z', statusName: 'Launch Failure', statusAbbrev: 'Failure' }),
    ]
    const summary = summarizeHistory('starlink group', flights, 2026)
    expect(summary.launchesThisYear).toBe(3)
    expect(summary.last?.name).toContain('Flight 15')
    expect(isFlownSuccess(flights[4])).toBe(false)
    expect(formatMountain('2026-11-13T22:47:36Z')).toMatch(/MT/)
    expect(formatMountain('2026-11-13T22:47:36Z')).not.toMatch(/22:47/)
    const history: TrackerHistory = { fetchedAt: '2026-11-15T12:00:00Z', byId: { starlink: flights } }
    const [row] = trackerRows([source({ latestLaunchDate: '2026-10-31' })], [], '2026-11-15', Date.parse('2026-11-15T18:00:00Z'), history)
    expect(row.launchesThisYear.text).toBe('3 launches')
    expect(row.launchesThisYear.sourceTitle).toBe('Launch Library 2')
    expect(row.lastLaunch.text).toMatch(/MT/)
    expect(row.lastLaunch.note).toContain('Flight 15')
    expect(row.inOrbit.note).toBe(CATALOG_LAG_NOTE)
    const [caughtUp] = trackerRows([source({ latestLaunchDate: '2026-11-13' })], [], '2026-11-15', Date.parse('2026-11-15T18:00:00Z'), history)
    expect(caughtUp.inOrbit.note).toBeNull()
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

describe('pro manifest facts', () => {
  it('cites public fields and leaves a missing rideshare blank', () => {
    const plain = makeLaunch()
    const facts = manifestFacts(plain, '2026-11-15')
    expect(facts.find((fact) => fact.label === 'Target orbit')?.text).toContain('Low Earth')
    expect(facts.find((fact) => fact.label === 'Target orbit')?.sourceUrl).toMatch(/^https:\/\//)
    expect(facts.find((fact) => fact.label === 'Rideshare')?.text).toBe('No public figure yet')
    const rideshare = makeLaunch({ name: 'Falcon 9 Block 5 | Transporter 12', missionName: 'Transporter 12' })
    expect(rideshareSlot(rideshare)).toMatch(/Transporter 12/i)
    expect(manifestFacts(rideshare, null).every((fact) => fact.text === 'No public figure yet')).toBe(true)
  })
})

describe('pro trends and alerts', () => {
  it('counts flights by month and writes a local feed when a clock moves or a flight is new', () => {
    const flights = [
      flown({ id: 'jan', net: '2026-01-04T06:48:10Z' }),
      flown({ id: 'nov', name: 'Starship | Starlink Group 31-2 (Starship Flight 15)', net: '2026-11-13T22:47:36Z' }),
    ]
    const months = monthlyCounts('starlink group', flights, 2026)
    expect(months[0]).toBe(1)
    expect(months[10]).toBe(1)
    expect(months.reduce((sum, value) => sum + value, 0)).toBe(2)

    const target = { kind: 'company' as const, id: 'spacex', label: 'A saved company', addedAt: '2026-11-01T00:00:00Z' }
    const launch = makeLaunch()
    const when = Date.parse('2026-11-01T00:00:00Z')
    let store = upsertRule(addTarget(emptyStore(), target), { id: 'date-moved', kind: 'date-moved', companyId: '', enabled: true })
    store = markSeen(store, { [targetKey(target)]: snapshotTarget(target, [launch], refs, when) })
    const moved = makeLaunch({ net: '2026-11-20T03:14:00Z' })
    const slipped = buildFeed(store, [moved], refs, when)
    expect(slipped.map((item) => item.kind)).toContain('date-moved')
    expect(slipped[0]?.at).toMatch(/2026-11-01/)

    const constellation = { kind: 'constellation' as const, id: 'starlink', label: 'Starlink', addedAt: '2026-11-01T00:00:00Z' }
    const fresh = upsertRule(addTarget(emptyStore(), constellation), { id: 'constellation-new', kind: 'constellation-new', companyId: '', enabled: true })
    const baselined = markSeen(fresh, {
      [targetKey(constellation)]: { nextId: null, nextNet: null, status: null, manifest: [], launches: [] },
    })
    const added = buildFeed(baselined, [launch], refs, when)
    expect(added.map((item) => item.kind)).toContain('constellation-new')
  })
})

describe('placeholder launch times', () => {
  it('does not turn a month precision midnight into a Mountain Time clock', () => {
    const shown = formatLaunchWhen('2026-11-30T00:00:00Z', 'Month', 'To Be Determined')
    expect(shown).toBe('November 2026, clock not set')
    expect(shown).not.toMatch(/5:00|PM/)
    expect(formatLaunchWhen('2026-11-13T22:47:36Z', 'Second', 'Launch Successful')).toMatch(/MT/)
  })

  it('keeps OneWeb on its own listing when a Starlink flight shares the placeholder date', () => {
    const oneweb = makeLaunch({
      id: 'oneweb-21',
      name: 'Falcon 9 Block 5 | OneWeb 21',
      missionName: 'OneWeb 21',
      net: '2026-11-30T00:00:00Z',
      precision: 'Month',
      statusName: 'To Be Determined',
      rocketName: 'Falcon 9 Block 5',
    })
    const starlink = makeLaunch({
      id: 'starlink-15-21',
      name: 'Falcon 9 Block 5 | Starlink Group 15-21',
      missionName: 'Starlink Group 15-21',
      net: '2026-11-30T00:00:00Z',
      precision: 'Month',
      statusName: 'To Be Determined',
    })
    const [row] = trackerRows(
      [source({ id: 'oneweb', name: 'OneWeb', pattern: 'oneweb', companySlug: 'eutelsat' })],
      [starlink, oneweb],
      '2026-11-15',
      Date.parse('2026-11-01T00:00:00Z'),
    )
    expect(row.nextLaunch.text).toContain('OneWeb 21')
    expect(row.nextLaunch.text).not.toContain('Starlink')
    expect(row.nextLaunch.text).not.toMatch(/5:00|PM/)
  })
})

describe('pro early access', () => {
  it('accepts a complete note, ignores a honeypot, and writes a csv row', () => {
    const good = validateSignup({ name: 'Ada', email: 'ada@example.com', company: 'Example Satellites', role: 'Strategy', desk: 'company' }, '')
    expect(good.ok).toBe(true)
    if (!good.ok || 'ignored' in good) return
    const row = { ...good.value, createdAt: '2026-11-15T19:00:00.000Z' }
    expect(signupNote(row)).toMatch(/Company desk/)
    expect(signupCsv([row])).toContain('ada@example.com')
    expect(validateSignup(good.value, 'https://spam.example')).toEqual({ ok: true, ignored: true })
    expect(validateSignup({ ...good.value, email: 'not-an-email' }, '').ok).toBe(false)
  })
})
