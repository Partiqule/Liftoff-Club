import { describe, expect, it } from 'vitest'
import { HISTORY } from '@/lib/history'
import { searchAll } from '@/lib/search'
import type { Launch } from '@/lib/types'

describe('search and history', () => {
  it('finds a rocket, a history flight, and does not use the word walk', () => {
    const hits = searchAll('falcon heavy', [])
    expect(hits.some((hit) => hit.href === '/rockets/falcon-heavy')).toBe(true)
    expect(hits.some((hit) => hit.href === '/history#falcon-heavy-demo')).toBe(true)
    const text = HISTORY.map((item) => `${item.kid} ${item.adult}`).join(' ').toLowerCase()
    expect(text).not.toContain('walk')
    expect(HISTORY.every((item) => item.sourceUrl.startsWith('https://'))).toBe(true)
  })

  it('finds a launch on the board by pad', () => {
    const launch = { id: 'abc', name: 'Falcon 9 | Starlink', rocketName: 'Falcon 9', padName: 'SLC-40', padLocation: 'Florida', provider: { name: 'SpaceX', companyId: 'spacex' } } as Launch
    const hits = searchAll('slc-40', [launch])
    expect(hits.some((hit) => hit.kind === 'pad' && hit.href === '/launches/abc')).toBe(true)
  })
})
