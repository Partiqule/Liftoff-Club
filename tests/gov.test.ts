import { describe, expect, it } from 'vitest'
import { SPACE_NAICS, filterAwards, fromAward, keepAwardText, matchesSpaceKeyword, type Award } from '@/lib/pro/gov'

const sample: Award[] = [
  {
    id: 'new',
    recipient: 'North Recipient',
    amount: 1_000_000,
    amountLabel: '$1,000,000',
    date: '2026-10-01',
    dateLabel: 'Oct 1, 2026',
    agency: 'National Aeronautics and Space Administration',
    naics: '336414',
    url: 'https://www.usaspending.gov/award/new',
  },
  {
    id: 'old',
    recipient: 'Satellite Works',
    amount: 9_000_000,
    amountLabel: '$9,000,000',
    date: '2024-01-01',
    dateLabel: 'Jan 1, 2024',
    agency: 'Department of the Air Force',
    naics: '517410',
    url: 'https://www.usaspending.gov/award/old',
  },
]

describe('gov desk awards', () => {
  it('keeps the verified space NAICS list and gates the broad research code', () => {
    expect(SPACE_NAICS.map((item) => item.code)).toEqual(['336414', '336415', '336419', '517410', '541715', '927110'])
    expect(keepAwardText('927110', 'Office supplies')).toBe(true)
    expect(keepAwardText('541715', 'Pavement study')).toBe(false)
    expect(keepAwardText('541715', 'Satellite ground station research')).toBe(true)
    expect(matchesSpaceKeyword('A launch services draft')).toBe(true)
  })

  it('maps a USAspending award without inventing a date', () => {
    const award = fromAward(
      {
        'Award ID': '80JSC',
        'Recipient Name': 'Example Recipient',
        'Award Amount': 16000000,
        'Start Date': '2026-10-23',
        'Awarding Sub Agency': 'National Aeronautics and Space Administration',
        generated_internal_id: 'CONT_AWD_80JSC_8000',
      },
      '336414',
    )
    expect(award?.amountLabel).toBe('$16,000,000')
    expect(award?.dateLabel).not.toMatch(/AM|PM/)
    expect(award?.url).toBe('https://www.usaspending.gov/award/CONT_AWD_80JSC_8000')
    expect(fromAward({ 'Award ID': 'x', 'Recipient Name': 'Pavement Co' }, '541715')).toBeNull()
  })

  it('filters by agency and keyword, limits the date range, and sorts by amount', () => {
    const now = Date.parse('2026-11-15T00:00:00Z')
    expect(filterAwards(sample, { agency: 'Department of the Air Force' }, now).map((row) => row.id)).toEqual(['old'])
    expect(filterAwards(sample, { keyword: 'satellite' }, now).map((row) => row.id)).toEqual(['old'])
    expect(filterAwards(sample, { range: '365' }, now).map((row) => row.id)).toEqual(['new'])
    expect(filterAwards(sample, { sort: 'amount' }, now).map((row) => row.id)).toEqual(['old', 'new'])
  })
})
