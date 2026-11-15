import { describe, expect, it } from 'vitest'
import { digestConfirmText, digestShouldSend, digestText } from '@/lib/pro/digest-model'
import { filterFilings, normalizeFiling } from '@/lib/pro/filings-model'
import { averageDays, recordNet, slipDays, summarizeSlips } from '@/lib/pro/net-slips'
import { mergeTimeline } from '@/lib/pro/timeline'
import { VEHICLES, vehicleProblems } from '@/lib/pro/vehicles'
import { commerceFree } from '@/lib/pro/access-gate'

describe('vehicle board', () => {
  it('cites every published figure and leaves the rest unpublished', () => {
    expect(VEHICLES.flatMap(vehicleProblems)).toEqual([])
    const falcon = VEHICLES.find((row) => row.id === 'falcon-9')
    expect(falcon?.leo.state === 'cited' && falcon.leo.text).toBe('22,800 kg')
    expect(falcon?.sso.state).toBe('unpublished')
    expect(falcon?.price.state).toBe('unpublished')
    const text = JSON.stringify(VEHICLES)
    expect(text.toLowerCase()).not.toContain('walk')
    expect(text).not.toMatch(/[—–]/)
  })
})

describe('filings', () => {
  it('keeps a satellite filing and can filter by company and type', () => {
    const row = normalizeFiling({
      id_submission: '123',
      filers: [{ name: 'Example Satellites' }],
      submissiontype: { description: 'LETTER' },
      date_disseminated: '2026-11-13T16:00:00.000Z',
      proceedings: [{ name: '17-95', description: 'Earth stations in the satellite service' }],
      documents: [{ src: 'https://www.fcc.gov/ecfs/document/123/1', filename: 'note.pdf' }],
    })
    expect(row?.filer).toBe('Example Satellites')
    expect(row?.url.startsWith('https://')).toBe(true)
    expect(normalizeFiling({ id_submission: '9', filers: [{ name: 'Ada' }], proceedings: [{ description: 'Broadcast radio' }] })).toBeNull()
    expect(filterFilings(row ? [row] : [], { company: 'example', type: 'LETTER' })).toHaveLength(1)
    expect(filterFilings(row ? [row] : [], { type: 'COMMENT' })).toHaveLength(0)
  })
})

describe('slip history', () => {
  it('counts only later clocks and averages them by rocket', () => {
    const points = recordNet(recordNet([], '2026-11-01T00:00:00Z', '2026-10-01T00:00:00Z'), '2026-11-03T00:00:00Z', '2026-10-02T00:00:00Z')
    expect(slipDays(points)).toEqual([2])
    const earlier = recordNet(points, '2026-11-02T00:00:00Z', '2026-10-03T00:00:00Z')
    expect(slipDays(earlier)).toEqual([2])
    expect(averageDays([2, 4])).toBe(3)
    const rows = summarizeSlips(
      [
        { name: 'A', rocket: 'Alpha', provider: 'Example', points },
        { name: 'B', rocket: 'Alpha', provider: 'Example', points: earlier },
      ],
      'rocket',
    )
    expect(rows[0]?.label).toBe('Alpha')
    expect(rows[0]?.count).toBe(2)
  })
})

describe('digest gate', () => {
  it('sends at 7 on Monday morning in Denver, and keeps the note free of a price', () => {
    expect(digestShouldSend({ event: 'schedule', admin: false, now: new Date('2026-11-16T14:00:00Z') })).toBe(true)
    expect(digestShouldSend({ event: 'schedule', admin: false, now: new Date('2026-11-16T13:00:00Z') })).toBe(false)
    expect(digestShouldSend({ event: 'workflow_dispatch', admin: false, now: new Date('2026-11-17T18:00:00Z') })).toBe(true)
    expect(digestShouldSend({ event: null, admin: true, now: new Date('2026-11-17T18:00:00Z') })).toBe(true)
    const text = `${digestText({ title: 'Liftoff Club Pro digest', windowLabel: 'The next seven days.', launches: [], tests: [], slips: [], filings: [] }, 'https://liftoffclub.app')}\n${digestConfirmText('https://liftoffclub.app/in').text}`
    expect(text).toContain('Free during early access.')
    expect(commerceFree(text)).toBe(true)
    expect(text.toLowerCase()).not.toContain('walk')
  })
})

describe('company timeline', () => {
  it('sorts newest first and leaves undated rows at the end', () => {
    const rows = mergeTimeline([
      [{ id: 'old', at: '2026-01-01', kind: 'launch', title: 'Old', detail: '', href: '/launches/old' }],
      [{ id: 'new', at: '2026-06-01', kind: 'event', title: 'New', detail: '', href: '/events' }],
      [{ id: 'none', at: null, kind: 'filing', title: 'Open', detail: '', href: 'https://www.fcc.gov/' }],
    ])
    expect(rows.map((row) => row.id)).toEqual(['new', 'old', 'none'])
  })
})
