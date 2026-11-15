import { describe, expect, it } from 'vitest'
import { SPACE_NAICS, filterOpportunities, fromAward, fromSam, keepOpportunity, matchesSpaceKeyword } from '@/lib/pro/gov'

describe('gov desk records', () => {
  it('keeps the verified space NAICS list and gates the broad research code', () => {
    expect(SPACE_NAICS.map((item) => item.code)).toEqual(['336414', '336415', '336419', '517410', '541715', '927110'])
    expect(keepOpportunity('927110', 'Office supplies')).toBe(true)
    expect(keepOpportunity('541715', 'Pavement study')).toBe(false)
    expect(keepOpportunity('541715', 'Satellite ground station research')).toBe(true)
    expect(keepOpportunity('999999', 'Satellite')).toBe(false)
    expect(matchesSpaceKeyword('A launch services draft')).toBe(true)
  })

  it('maps a SAM notice and a USAspending award without inventing a deadline', () => {
    const notice = fromSam({
      noticeId: 'abc',
      title: 'Space vehicle integration',
      fullParentPathName: 'DEPT OF DEFENSE.DEPT OF THE AIR FORCE',
      type: 'Solicitation',
      postedDate: '2026-11-01',
      naicsCode: '336414',
      uiLink: 'https://sam.gov/opp/abc/view',
    })
    expect(notice?.agency).toBe('DEPT OF THE AIR FORCE')
    expect(notice?.deadlineLabel).toBe('No public deadline yet')
    expect(notice?.postedLabel).not.toMatch(/AM|PM/)
    expect(notice?.url).toBe('https://sam.gov/opp/abc/view')
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
    expect(award?.url).toBe('https://www.usaspending.gov/award/CONT_AWD_80JSC_8000')
    expect(fromAward({ 'Award Amount': null }, '336414')).toBeNull()
  })

  it('filters notices by agency, type, keyword, and deadline', () => {
    const rows = [
      {
        id: '1',
        title: 'Launch services',
        agency: 'NASA',
        noticeType: 'Solicitation',
        posted: '2026-11-01',
        postedLabel: 'Nov 1, 2026',
        deadline: '2026-12-01T18:00:00Z',
        deadlineLabel: 'Dec 1, 2026, 11:00 AM MT',
        setAside: 'No set aside listed',
        naics: '336414',
        url: 'https://sam.gov/opp/1/view',
      },
      {
        id: '2',
        title: 'Satellite bus',
        agency: 'NOAA',
        noticeType: 'Sources Sought',
        posted: '2026-10-01',
        postedLabel: 'Oct 1, 2026',
        deadline: '2020-01-01T00:00:00Z',
        deadlineLabel: 'Dec 31, 2019, 5:00 PM MT',
        setAside: 'No set aside listed',
        naics: '517410',
        url: 'https://sam.gov/opp/2/view',
      },
    ]
    expect(filterOpportunities(rows, { agency: 'NASA' }, Date.parse('2026-11-15T00:00:00Z'))).toHaveLength(1)
    expect(filterOpportunities(rows, { keyword: 'bus' }, Date.parse('2026-11-15T00:00:00Z'))[0]?.id).toBe('2')
    expect(filterOpportunities(rows, { deadline: 'open' }, Date.parse('2026-11-15T00:00:00Z')).map((row) => row.id)).toEqual(['1'])
    expect(filterOpportunities(rows, { noticeType: 'Sources Sought' }, Date.parse('2026-11-15T00:00:00Z'))).toHaveLength(1)
  })
})
