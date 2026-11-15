import { formatMountain } from '@/lib/pro/time'

/**
 * Census NAICS 2022 titles.
 * 336414, 336415, and 336419 cover space vehicles and also guided missiles.
 * 541715 is broad research, so an award in that code is kept only when the text matches a space keyword.
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

export type Award = {
  id: string
  recipient: string
  amount: number | null
  amountLabel: string
  date: string
  dateLabel: string
  agency: string
  naics: string
  url: string
}

export function matchesSpaceKeyword(text: string): boolean {
  const hay = text.toLowerCase()
  return SPACE_KEYWORDS.some((word) => hay.includes(word))
}

export function keepAwardText(naics: string, text: string): boolean {
  const code = SPACE_NAICS.find((item) => item.code === naics)
  if (!code) return false
  if (!code.keywordGate) return true
  return matchesSpaceKeyword(text)
}

export function formatPublicWhen(value: string | null | undefined): string {
  if (!value?.trim()) return 'No public date yet'
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
  if (!id || !recipient || !keepAwardText(naics, `${recipient} ${row['Awarding Sub Agency'] ?? ''} ${row['Awarding Agency'] ?? ''}`)) return null
  const internal = row.generated_internal_id?.trim()
  const amount = typeof row['Award Amount'] === 'number' && Number.isFinite(row['Award Amount']) ? row['Award Amount'] : null
  return {
    id,
    recipient,
    amount,
    amountLabel: amount == null ? 'No public figure yet' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount),
    date: row['Start Date'] ?? '',
    dateLabel: formatPublicWhen(row['Start Date']),
    agency: (row['Awarding Sub Agency'] || row['Awarding Agency'] || 'Agency not listed').trim(),
    naics,
    url: internal ? `https://www.usaspending.gov/award/${internal}` : `https://www.usaspending.gov/search/?hash=${encodeURIComponent(id)}`,
  }
}

export function filterAwards(
  rows: Award[],
  query: { agency?: string; keyword?: string; range?: '' | '365' | '90'; sort?: 'newest' | 'amount' },
  now = Date.now(),
): Award[] {
  const keyword = query.keyword?.trim().toLowerCase() ?? ''
  const span = query.range === '90' ? 90 : query.range === '365' ? 365 : 0
  const filtered = rows.filter((row) => {
    if (query.agency && row.agency !== query.agency) return false
    if (keyword && !`${row.recipient} ${row.agency} ${row.naics}`.toLowerCase().includes(keyword)) return false
    if (span > 0) {
      const when = Date.parse(row.date)
      if (!Number.isFinite(when) || when < now - span * 24 * 60 * 60 * 1000) return false
    }
    return true
  })
  return filtered.sort((a, b) => {
    if (query.sort === 'amount') return (b.amount ?? -1) - (a.amount ?? -1)
    return (b.date || '').localeCompare(a.date || '')
  })
}
