import { publishedReason } from '@/lib/slip'
import { isStillAhead } from '@/lib/schedule'
import { formatMountain } from '@/lib/pro/time'
import { PRO_COPY } from '@/lib/pro/copy'
import type { Launch } from '@/lib/types'

export type Quarter = 1 | 2 | 3 | 4

export type ReviewLine = {
  id: string
  name: string
  when: string
  href: string
}

export type SourcedLine = {
  text: string
  sourceUrl: string
  sourceTitle: string
  asOf: string
}

export type ReviewModel = {
  title: string
  quarterLabel: string
  illustrative: boolean
  flown: ReviewLine[]
  payloadLine: string
  payloadNames: string[]
  slips: { id: string; text: string }[]
  next: ReviewLine[]
  deployment: { name: string; lines: SourcedLine[] }[]
  gaps: string[]
  sources: SourcedLine[]
  affiliation: string
}

const LL2 = 'https://thespacedevs.com/llapi'
const QUARTER_NAMES = ['January through March', 'April through June', 'July through September', 'October through December'] as const

export function quarterRange(year: number, quarter: Quarter): { start: number; end: number; label: string } {
  const startMonth = (quarter - 1) * 3
  const start = Date.UTC(year, startMonth, 1)
  const end = Date.UTC(year, startMonth + 3, 1) - 1
  return { start, end, label: `${QUARTER_NAMES[quarter - 1]} ${year}` }
}

export function recentQuarters(now = new Date(), count = 5): { year: number; quarter: Quarter; label: string }[] {
  const month = now.getUTCMonth()
  let year = now.getUTCFullYear()
  let quarter = (Math.floor(month / 3) + 1) as Quarter
  const rows: { year: number; quarter: Quarter; label: string }[] = []
  for (let i = 0; i < count; i += 1) {
    rows.push({ year, quarter, label: quarterRange(year, quarter).label })
    quarter = (quarter === 1 ? 4 : ((quarter - 1) as Quarter))
    if (quarter === 4) year -= 1
  }
  return rows
}

export function launchMatchesCompany(launch: Launch, slug: string): boolean {
  if (launch.provider.companyId === slug) return true
  return launch.manifest.some((item) => item.companySlug === slug)
}

export function buildReview(input: {
  title: string
  year: number
  quarter: Quarter
  launches: Launch[]
  asOf: string | null
  deployment: { name: string; lines: SourcedLine[] }[]
  historyGap: string | null
}): ReviewModel {
  const range = quarterRange(input.year, input.quarter)
  const dated = input.asOf && /^\d{4}-\d{2}-\d{2}$/.test(input.asOf) ? input.asOf : null
  const inQuarter = input.launches.filter((launch) => inRange(launch.net, range.start, range.end))
  const flown = inQuarter.filter(isFlown).map(lineFor)
  const payload = payloadSummary(inQuarter.filter(isFlown))
  const slips = inQuarter.filter(isSlipStatus).map((launch) => ({
    id: launch.id,
    text: slipText(launch),
  }))
  const next = input.launches
    .filter((launch) => isStillAhead(launch))
    .sort((a, b) => (a.net ?? '9999').localeCompare(b.net ?? '9999'))
    .slice(0, 6)
    .map(lineFor)
  const gaps: string[] = []
  if (input.historyGap) gaps.push(input.historyGap)
  if (flown.length === 0) gaps.push('No successful flight in this quarter is on the public list.')
  if (slips.length === 0) gaps.push('No scrub or slip in this quarter has a public status.')
  if (next.length === 0) gaps.push('Nothing ahead is on the current board for this cut.')
  if (input.deployment.length === 0) gaps.push('No public in orbit figure is tied to this company.')
  const sources: SourcedLine[] = []
  if (dated) sources.push({ text: 'Launch times, status, and payload names.', sourceUrl: LL2, sourceTitle: 'Launch Library 2', asOf: dated })
  for (const group of input.deployment) sources.push(...group.lines)
  return {
    title: input.title,
    quarterLabel: range.label,
    illustrative: false,
    flown,
    payloadLine: payload.line,
    payloadNames: payload.names,
    slips,
    next,
    deployment: input.deployment,
    gaps,
    sources,
    affiliation: PRO_COPY.footerLine,
  }
}

export function exampleReview(asOf = '2026-11-15'): ReviewModel {
  return {
    title: 'Example company',
    quarterLabel: 'January through March',
    illustrative: true,
    flown: [],
    payloadLine: 'No public payload list on an example page.',
    payloadNames: [],
    slips: [],
    next: [],
    deployment: [],
    gaps: ['Example layout. These lines are not a customer record. A figure appears only when a public source states it.'],
    sources: [{ text: 'The live review cites the public board.', sourceUrl: LL2, sourceTitle: 'Launch Library 2', asOf }],
    affiliation: PRO_COPY.footerLine,
  }
}

export function deploymentFromCells(
  name: string,
  inOrbit: { text: string; sourceUrl: string | null; sourceTitle: string | null; asOf: string | null },
  planned: { text: string; sourceUrl: string | null; sourceTitle: string | null; asOf: string | null },
): { name: string; lines: SourcedLine[] } | null {
  const lines: SourcedLine[] = []
  if (inOrbit.sourceUrl && inOrbit.sourceTitle && inOrbit.asOf && inOrbit.text !== 'No public figure yet') {
    lines.push({ text: `In orbit: ${inOrbit.text}.`, sourceUrl: inOrbit.sourceUrl, sourceTitle: inOrbit.sourceTitle, asOf: inOrbit.asOf })
  }
  if (planned.sourceUrl && planned.sourceTitle && planned.asOf && planned.text !== 'No public figure yet') {
    lines.push({ text: `Planned or authorized: ${planned.text}.`, sourceUrl: planned.sourceUrl, sourceTitle: planned.sourceTitle, asOf: planned.asOf })
  }
  return lines.length > 0 ? { name, lines } : null
}

function lineFor(launch: Launch): ReviewLine {
  return {
    id: launch.id,
    name: launch.name,
    when: launch.net ? formatMountain(launch.net) : 'Clock not set',
    href: `/launches/${launch.id}`,
  }
}

function inRange(net: string | null, start: number, end: number): boolean {
  if (!net) return false
  const when = Date.parse(net)
  return Number.isFinite(when) && when >= start && when <= end
}

function isFlown(launch: Launch): boolean {
  const text = `${launch.statusAbbrev} ${launch.statusName}`.toLowerCase()
  if (/fail|scrub|\bhold\b|partial/.test(text)) return false
  return /success/.test(text)
}

function isSlipStatus(launch: Launch): boolean {
  return /scrub|\bhold\b|fail|partial|delay|postpon/.test(`${launch.statusAbbrev} ${launch.statusName}`.toLowerCase())
}

function slipText(launch: Launch): string {
  const reason = publishedReason(launch)
  const status = launch.statusName || 'Unknown'
  return reason ? `${launch.name}. Status is ${status}. Reason: ${reason}` : `${launch.name}. Status is ${status}. No reason was published.`
}

function payloadSummary(flown: Launch[]): { line: string; names: string[] } {
  if (flown.length === 0) return { line: 'No successful flight in this quarter is on the public list.', names: [] }
  const names: string[] = []
  let complete = true
  let total = 0
  for (const launch of flown) {
    const items = launch.manifest.filter((item) => item.role === 'payload' || item.role === 'spacecraft')
    if (items.length === 0) {
      complete = false
      continue
    }
    for (const item of items) {
      const count = item.count && item.count > 0 ? item.count : 1
      total += count
      names.push(count > 1 ? `${item.name} (${count})` : item.name)
    }
  }
  if (!complete || names.length === 0) {
    return { line: 'No public payload list covers every flight in this quarter.', names }
  }
  const noun = total === 1 ? 'payload is named' : 'payloads are named'
  return { line: `${total} ${noun} on the public list.`, names }
}
