import type { CitedFigure } from '@/lib/cited'
import type { ConstellationProfile } from '@/lib/constellation-data'
import type { ConstellationCounts } from '@/lib/constellation-tally'
import { aiNotesForCompany } from '@/lib/ai-orbit'
import { CATALOG_LAG_NOTE, HISTORY_PATTERNS, catalogIsBehind, monthlyCounts, summarizeHistory, type HistoryLaunch } from '@/lib/pro/history'
import { formatLaunchWhen, formatMountain, mountainYear } from '@/lib/pro/time'
import { clockIsFuture, isHistorical } from '@/lib/schedule'
import type { Launch } from '@/lib/types'

export type TrackerSource = {
  id: string
  name: string
  operator: string
  companySlug: string | null
  pattern: string
  group: string
  inOrbit: number | null
  launchesThisYear: number | null
  latestLaunchDate: string | null
  catalogAsOf: string | null
  authorized: CitedFigure | null
  capacity: CitedFigure | null
}

export type TrackerCell = {
  text: string
  sort: number | null
  sourceUrl: string | null
  sourceTitle: string | null
  asOf: string | null
  note: string | null
}

export type TrackerRow = {
  id: string
  name: string
  operator: string
  companySlug: string | null
  inOrbit: TrackerCell
  launchesThisYear: TrackerCell
  authorized: TrackerCell
  capacity: TrackerCell
  lastLaunch: TrackerCell
  nextLaunch: TrackerCell
  nextLaunchId: string | null
  ai: TrackerCell
  /** Twelve month counts for the current year, or null when history did not answer. */
  months: number[] | null
}

const BLANK = 'No public figure yet'
export const ORBIT_ABOVE_PLAN_NOTE = 'This count includes spare satellites and retired satellites that are still in orbit.'
const DATE = /^\d{4}-\d{2}-\d{2}$/
const LL2 = 'https://thespacedevs.com/llapi'

export type TrackerHistory = {
  fetchedAt: string | null
  byId: Record<string, HistoryLaunch[] | null>
}

export function blankCell(): TrackerCell {
  return { text: BLANK, sort: null, sourceUrl: null, sourceTitle: null, asOf: null, note: null }
}

export function sourceFromProfile(
  profile: ConstellationProfile,
  counts: ConstellationCounts | null,
  fetchedAt: string | null,
): TrackerSource {
  const day = fetchedAt?.slice(0, 10) ?? null
  return {
    id: profile.id,
    name: profile.name,
    operator: profile.operator,
    companySlug: profile.companySlug,
    pattern: profile.launchPattern,
    group: profile.celestrakGroup,
    inOrbit: counts ? counts.inOrbit : null,
    launchesThisYear: counts ? counts.launchesThisYear : null,
    latestLaunchDate: counts?.latestLaunchDate ?? null,
    catalogAsOf: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null,
    authorized: profile.satellites,
    capacity: profile.bandwidth,
  }
}

export function trackerRows(
  sources: TrackerSource[],
  launches: Launch[],
  boardAsOf: string | null,
  now = Date.now(),
  history: TrackerHistory | null = null,
): TrackerRow[] {
  return sources.map((source) => rowFor(source, launches, boardAsOf, now, history))
}

function rowFor(
  source: TrackerSource,
  launches: Launch[],
  boardAsOf: string | null,
  now: number,
  history: TrackerHistory | null,
): TrackerRow {
  const next = nextLaunch(source, launches, now)
  const notes = source.companySlug ? aiNotesForCompany(source.companySlug) : []
  const note = notes[0] ?? null
  const pattern = HISTORY_PATTERNS[source.id] ?? source.pattern
  const flights = history?.byId?.[source.id]
  const historyDay = history?.fetchedAt?.slice(0, 10) ?? null
  const historyReady = Boolean(flights && historyDay && DATE.test(historyDay))
  const year = mountainYear(now) ?? new Date(now).getUTCFullYear()
  const summary = historyReady && flights ? summarizeHistory(pattern, flights, year) : null
  const behind = catalogIsBehind(summary?.last?.net, source.latestLaunchDate)
  const inOrbit = catalogNumber(source.inOrbit, source.group, source.catalogAsOf, 'satellites')
  const orbitNotes = [behind ? CATALOG_LAG_NOTE : null, abovePlanNote(source)].filter((item): item is string => Boolean(item))
  if (orbitNotes.length > 0) inOrbit.note = orbitNotes.join(' ')
  return {
    id: source.id,
    name: source.name,
    operator: source.operator,
    companySlug: source.companySlug,
    inOrbit,
    launchesThisYear: summary
      ? {
          text: `${formatNumber(summary.launchesThisYear)} launches`,
          sort: summary.launchesThisYear,
          sourceUrl: historyUrl(source.id),
          sourceTitle: 'Launch Library 2',
          asOf: historyDay,
          note: null,
        }
      : blankCell(),
    authorized: fromFigure(source.authorized),
    capacity: fromFigure(source.capacity),
    lastLaunch: summary?.last?.net
      ? {
          text: formatMountain(summary.last.net),
          sort: Date.parse(summary.last.net),
          sourceUrl: historyUrl(source.id),
          sourceTitle: 'Launch Library 2',
          asOf: historyDay,
          note: summary.last.name,
        }
      : blankCell(),
    nextLaunch: next
      ? {
          text: next.net ? `${next.name} · ${formatLaunchWhen(next.net, next.precision, next.statusName)}` : next.name,
          sort: next.net ? Date.parse(next.net) : null,
          sourceUrl: LL2,
          sourceTitle: 'Launch Library 2',
          asOf: boardAsOf && DATE.test(boardAsOf) ? boardAsOf : null,
          note: null,
        }
      : { ...blankCell(), text: 'None on the board' },
    nextLaunchId: next?.id ?? null,
    months: historyReady && flights ? monthlyCounts(pattern, flights, year) : null,
    ai: note
      ? {
          text: 'Listed',
          sort: 1,
          sourceUrl: note.sourceUrl,
          sourceTitle: note.sourceTitle,
          asOf: note.asOf,
          note: note.adult,
        }
      : { ...blankCell(), text: 'No public note yet' },
  }
}

function nextLaunch(source: TrackerSource, launches: Launch[], now: number): Launch | null {
  let pattern: RegExp
  try {
    pattern = new RegExp(source.pattern, 'i')
  } catch {
    return null
  }
  const matched = launches.filter((launch) => {
    if (isHistorical(launch)) return false
    if (!pattern.test(`${launch.name} ${launch.missionName ?? ''} ${launch.rocketName}`)) return false
    return clockIsFuture(launch, now)
  })
  matched.sort((a, b) => (a.net ?? '9999').localeCompare(b.net ?? '9999'))
  return matched[0] ?? null
}

function abovePlanNote(source: TrackerSource): string | null {
  const plan = source.authorized
  if (source.inOrbit == null || !plan || plan.unit !== 'satellites') return null
  if (source.inOrbit <= plan.value) return null
  return ORBIT_ABOVE_PLAN_NOTE
}

function catalogNumber(value: number | null, group: string, asOf: string | null, unit: string): TrackerCell {
  if (value == null || !asOf || !DATE.test(asOf)) return blankCell()
  return {
    text: `${formatNumber(value)} ${unit}`,
    sort: value,
    sourceUrl: catalogUrl(group),
    sourceTitle: 'CelesTrak SATCAT',
    asOf,
    note: null,
  }
}

function fromFigure(figure: CitedFigure | null): TrackerCell {
  if (!figure) return blankCell()
  return {
    text: `${formatNumber(figure.value)} ${figure.unit}`,
    sort: figure.value,
    sourceUrl: figure.sourceUrl,
    sourceTitle: figure.sourceTitle,
    asOf: figure.asOf,
    note: figure.note,
  }
}

function catalogUrl(group: string): string {
  return `https://celestrak.org/satcat/records.php?GROUP=${encodeURIComponent(group)}&FORMAT=JSON`
}

function historyUrl(id: string): string {
  const search = id === 'starlink' ? 'Starlink Group' : id === 'kuiper' ? 'Kuiper' : id === 'oneweb' ? 'OneWeb' : 'Iridium'
  return `https://ll.thespacedevs.com/2.3.0/launches/previous/?search=${encodeURIComponent(search)}&mode=list`
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}
