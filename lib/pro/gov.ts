import { formatMountain } from '@/lib/pro/time'

/**
 * Census NAICS 2022 titles.
 * 336414, 336415, and 336419 cover space vehicles and also guided missiles.
 * 541715 is broad research, so a notice in that code is kept only when the text matches a space keyword.
 */
export const SPACE_NAICS = [
  { code: '336414', title: 'Guided Missile and Space Vehicle Manufacturing', keywordGate: false },
  { code: '336415', title: 'Guided Missile and Space Vehicle Propulsion Unit and Propulsion Unit Parts Manufacturing', keywordGate: false },
  { code: '336419', title: 'Other Guided Missile and Space Vehicle Parts and Auxiliary Equipment Manufacturing', keywordGate: false },
  { code: '517410', title: 'Satellite Telecommunications', keywordGate: false },
  { code: '541715', title: 'Research and Development in the Physical, Engineering, and Life Sciences (except Nanotechnology and Biotechnology)', keywordGate: true },
  { code: '927110', title: 'Space Research and Technology', keywordGate: false },
] as const

export const SPACE_KEYWORDS = ['launch', 'satellite', 'spacecraft', 'ground station', 'space vehicle', 'spaceport'] as const

/** Agencies USAspending actually returns under these names. Space Force sits inside the Air Force. NRO is queried and omitted when the feed has no rows. */
export const GOV_AGENCIES = [
  { tier: 'toptier' as const, name: 'National Aeronautics and Space Administration' },
  { tier: 'subtier' as const, name: 'Department of the Air Force' },
  { tier: 'subtier' as const, name: 'National Oceanic and Atmospheric Administration' },
  { tier: 'subtier' as const, name: 'National Reconnaissance Office' },
]

export type Opportunity = {
  id: string
  title: string
  agency: string
  noticeType: string
  posted: string
  postedLabel: string
  deadline: string | null
  deadlineLabel: string
  setAside: string
  naics: string
  url: string
}

export type Award = {
  id: string
  recipient: string
  amountLabel: string
  dateLabel: string
  agency: string
  naics: string
  url: string
}

export function matchesSpaceKeyword(text: string): boolean {
  const hay = text.toLowerCase()
  return SPACE_KEYWORDS.some((word) => hay.includes(word))
}

export function keepOpportunity(naics: string, text: string): boolean {
  const code = SPACE_NAICS.find((item) => item.code === naics)
  if (!code) return false
  if (!code.keywordGate) return true
  return matchesSpaceKeyword(text)
}

export function formatPublicWhen(value: string | null | undefined): string {
  if (!value?.trim()) return 'No public deadline yet'
  const text = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T12:00:00Z`)
    if (Number.isNaN(date.getTime())) return text
    return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  }
  const parsed = Date.parse(text)
  if (!Number.isFinite(parsed)) return text
  return formatMountain(new Date(parsed).toISOString())
}

type SamRow = {
  noticeId?: string
  title?: string
  fullParentPathName?: string
  type?: string
  postedDate?: string
  responseDeadLine?: string
  typeOfSetAsideDescription?: string
  naicsCode?: string
  uiLink?: string
}

export function fromSam(row: SamRow): Opportunity | null {
  const naics = (row.naicsCode ?? '').replace(/\D/g, '').slice(0, 6)
  const title = (row.title ?? '').trim()
  const id = (row.noticeId ?? '').trim()
  if (!id || !title || !keepOpportunity(naics, `${title} ${row.fullParentPathName ?? ''}`)) return null
  const url = row.uiLink?.startsWith('https://') ? row.uiLink : `https://sam.gov/opp/${id}/view`
  return {
    id,
    title,
    agency: (row.fullParentPathName ?? '').split('.').pop()?.trim() || 'Agency not listed',
    noticeType: (row.type ?? '').trim() || 'Notice',
    posted: row.postedDate ?? '',
    postedLabel: formatPublicWhen(row.postedDate),
    deadline: row.responseDeadLine?.trim() || null,
    deadlineLabel: formatPublicWhen(row.responseDeadLine),
    setAside: (row.typeOfSetAsideDescription ?? '').trim() || 'No set aside listed',
    naics,
    url,
  }
}

type AwardRow = {
  'Award ID'?: string
  'Recipient Name'?: string
  'Award Amount'?: number | null
  'Start Date'?: string
  'Awarding Agency'?: string
  'Awarding Sub Agency'?: string
  generated_internal_id?: string
}

export function fromAward(row: AwardRow, naics: string): Award | null {
  const id = (row['Award ID'] ?? '').trim()
  const recipient = (row['Recipient Name'] ?? '').trim()
  if (!id || !recipient) return null
  const internal = row.generated_internal_id?.trim()
  const amount = row['Award Amount']
  return {
    id,
    recipient,
    amountLabel:
      typeof amount === 'number' && Number.isFinite(amount)
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
        : 'No public figure yet',
    dateLabel: formatPublicWhen(row['Start Date']),
    agency: (row['Awarding Sub Agency'] || row['Awarding Agency'] || 'Agency not listed').trim(),
    naics,
    url: internal ? `https://www.usaspending.gov/award/${internal}` : `https://www.usaspending.gov/search/?hash=${encodeURIComponent(id)}`,
  }
}

export function filterOpportunities(
  rows: Opportunity[],
  query: { agency?: string; noticeType?: string; deadline?: string; keyword?: string },
  now = Date.now(),
): Opportunity[] {
  const keyword = query.keyword?.trim().toLowerCase() ?? ''
  return rows.filter((row) => {
    if (query.agency && row.agency !== query.agency) return false
    if (query.noticeType && row.noticeType !== query.noticeType) return false
    if (keyword && !`${row.title} ${row.agency} ${row.naics}`.toLowerCase().includes(keyword)) return false
    if (query.deadline === 'open') {
      if (!row.deadline) return true
      const when = Date.parse(row.deadline)
      return !Number.isFinite(when) || when >= now
    }
    if (query.deadline === '30') {
      if (!row.deadline) return false
      const when = Date.parse(row.deadline)
      return Number.isFinite(when) && when >= now && when <= now + 30 * 24 * 60 * 60 * 1000
    }
    return true
  })
}
