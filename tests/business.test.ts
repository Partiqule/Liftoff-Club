import { describe, expect, it } from 'vitest'
import { buildReview, deploymentFromCells, exampleReview, quarterRange } from '@/lib/business/review'
import { signupNote, validateSignup } from '@/lib/pro/signups'
import { BUSINESS_COPY, TIER_COPY } from '@/lib/tiers'
import { commerceFree } from '@/lib/pro/access-gate'
import { makeLaunch } from './fixtures'

describe('tiers', () => {
  it('keeps family free, names no company, and shows no price', () => {
    const text = `${JSON.stringify(TIER_COPY)} ${JSON.stringify(BUSINESS_COPY)}`
    expect(text).toContain('Free.')
    expect(text).toContain('Free during early access.')
    expect(text).toContain('For a team at a small satellite or constellation company.')
    expect(text).toContain('Coming soon')
    expect(text).not.toMatch(/Hubble|Starlink|SpaceX/)
    expect(text.toLowerCase()).not.toContain('walk')
    expect(text).not.toMatch(/[—–]/)
    expect(commerceFree(text)).toBe(true)
  })
})

describe('business access', () => {
  it('stores a business tier, company size, and optional tracking note', () => {
    const missing = validateSignup({ name: 'Ada', email: 'ada@example.com', company: 'Example Satellites', role: 'Strategy', tier: 'business' }, '')
    expect(missing.ok).toBe(false)
    const good = validateSignup(
      {
        name: 'Ada',
        email: 'ada@example.com',
        company: 'Example Satellites',
        role: 'Strategy',
        tier: 'business',
        companySize: '11 to 50',
        tracks: 'launches and spectrum',
      },
      '',
    )
    expect(good.ok).toBe(true)
    if (!good.ok || 'ignored' in good) return
    const note = signupNote({ ...good.value, createdAt: '2026-11-15T19:00:00.000Z' })
    expect(note).toContain('Tier: Business')
    expect(note).toContain('Company size: 11 to 50')
    expect(note).toContain('Tracks: launches and spectrum')
    expect(note.toLowerCase()).not.toContain('walk')
    expect(commerceFree(note)).toBe(true)
  })
})

describe('quarterly review', () => {
  it('counts a flown payload, keeps a published reason, and skips a bare number', () => {
    const flown = makeLaunch({
      id: 'done',
      name: 'Example rocket | Example flight',
      missionName: 'Example flight',
      missionDescription: 'One craft.',
      spacecraftName: 'Example craft',
      net: '2026-02-02T18:00:00Z',
      statusName: 'Launch Successful',
      statusAbbrev: 'Success',
      updates: [],
    })
    const scrub = makeLaunch({
      id: 'slip',
      name: 'Example rocket | Hold',
      missionName: 'Hold',
      missionDescription: 'Held.',
      net: '2026-02-10T18:00:00Z',
      windowStart: '2026-02-10T18:00:00Z',
      windowEnd: '2026-02-10T19:00:00Z',
      statusName: 'Scrubbed',
      statusAbbrev: 'Scrub',
      holdReason: 'High winds.',
      updates: [],
    })
    const quiet = makeLaunch({
      id: 'quiet',
      name: 'Example rocket | Quiet',
      missionName: 'Quiet',
      missionDescription: 'No note.',
      net: '2026-02-12T18:00:00Z',
      windowStart: '2026-02-12T18:00:00Z',
      windowEnd: '2026-02-12T19:00:00Z',
      statusName: 'Scrubbed',
      statusAbbrev: 'Scrub',
      updates: [],
      holdReason: null,
      failReason: null,
    })
    const later = makeLaunch({
      id: 'next',
      name: 'Example rocket | Next',
      missionName: 'Next',
      missionDescription: 'Later.',
      net: '2027-11-20T18:00:00Z',
      windowStart: '2027-11-20T18:00:00Z',
      windowEnd: '2027-11-20T19:00:00Z',
      statusName: 'Go for Launch',
      statusAbbrev: 'Go',
      updates: [],
    })
    const range = quarterRange(2026, 1)
    expect(Date.parse('2026-02-02T18:00:00Z')).toBeGreaterThanOrEqual(range.start)
    expect(Date.parse('2026-02-02T18:00:00Z')).toBeLessThanOrEqual(range.end)
    const review = buildReview({
      title: 'Example company',
      year: 2026,
      quarter: 1,
      launches: [flown, scrub, quiet, later],
      asOf: '2026-11-15',
      deployment: [],
      historyGap: null,
    })
    expect(review.flown.map((item) => item.id)).toEqual(['done'])
    expect(review.payloadLine).toBe('1 payload is named on the public list.')
    expect(review.payloadNames).toContain('Example craft')
    expect(review.slips.find((item) => item.id === 'slip')?.text).toContain('Reason: High winds.')
    expect(review.slips.find((item) => item.id === 'quiet')?.text).toContain('No reason was published.')
    expect(review.next.map((item) => item.id)).toContain('next')
    expect(review.deployment).toEqual([])
    expect(review.sources[0]?.sourceUrl).toBe('https://thespacedevs.com/llapi')
    const bare = deploymentFromCells('Network', { text: '10 satellites', sourceUrl: null, sourceTitle: null, asOf: null }, { text: 'No public figure yet', sourceUrl: null, sourceTitle: null, asOf: null })
    expect(bare).toBeNull()
    const cited = deploymentFromCells(
      'Network',
      { text: '10 satellites', sourceUrl: 'https://celestrak.org/NORAD/elements/', sourceTitle: 'CelesTrak', asOf: '2026-11-15' },
      { text: 'No public figure yet', sourceUrl: null, sourceTitle: null, asOf: null },
    )
    expect(cited?.lines[0]?.text).toContain('In orbit')
    const example = exampleReview()
    expect(example.illustrative).toBe(true)
    expect(JSON.stringify(example)).not.toMatch(/Hubble|Starlink|SpaceX/)
    expect(JSON.stringify(example).toLowerCase()).not.toContain('walk')
    expect(JSON.stringify(review)).not.toMatch(/[—–]/)
  })
})
