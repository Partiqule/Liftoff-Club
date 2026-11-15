import type { CitedFigure } from '@/lib/cited'
import { aiNotesForCompany } from '@/lib/ai-orbit'
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
}

const BLANK = 'No public figure yet'
const DATE = /^\d{4}-\d{2}-\d{2}$/
const LL2 = 'https://thespacedevs.com/llapi'

export function blankCell(): TrackerCell {
  return { text: BLANK, sort: null, sourceUrl: null, sourceTitle: null, asOf: null, note: null }
}

export function trackerRows(sources: TrackerSource[], launches: Launch[], boardAsOf: string | null, now = Date.now()): TrackerRow[] {
  return sources.map((source) => rowFor(source, launches, boardAsOf, now))
}

function rowFor(source: TrackerSource, launches: Launch[], boardAsOf: string | null, now: number): TrackerRow {
  const next = nextLaunch(source, launches, now)
  const notes = source.companySlug ? aiNotesForCompany(source.companySlug) : []
  const note = notes[0] ?? null
  return {
    id: source.id,
    name: source.name,
    operator: source.operator,
    companySlug: source.companySlug,
    inOrbit: catalogNumber(source.inOrbit, source.group, source.catalogAsOf, 'satellites'),
    launchesThisYear: catalogNumber(source.launchesThisYear, source.group, source.catalogAsOf, 'launches'),
    authorized: fromFigure(source.authorized),
    capacity: fromFigure(source.capacity),
    lastLaunch: source.latestLaunchDate && source.catalogAsOf && DATE.test(source.catalogAsOf) && DATE.test(source.latestLaunchDate)
      ? {
          text: source.latestLaunchDate,
          sort: Date.parse(`${source.latestLaunchDate}T00:00:00Z`),
          sourceUrl: catalogUrl(source.group),
          sourceTitle: 'CelesTrak SATCAT',
          asOf: source.catalogAsOf,
          note: 'Newest payload launch date in that catalog file.',
        }
      : blankCell(),
    nextLaunch: next
      ? {
          text: next.net ? `${next.name} · ${next.net.slice(0, 16).replace('T', ' ')} UTC` : next.name,
          sort: next.net ? Date.parse(next.net) : null,
          sourceUrl: LL2,
          sourceTitle: 'Launch Library 2',
          asOf: boardAsOf && DATE.test(boardAsOf) ? boardAsOf : null,
          note: null,
        }
      : { ...blankCell(), text: 'None on the board' },
    nextLaunchId: next?.id ?? null,
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
    if (!pattern.test(`${launch.name} ${launch.missionName ?? ''} ${launch.rocketName}`)) return false
    if (!launch.net) return true
    const when = Date.parse(launch.net)
    return Number.isFinite(when) && when > now - 30 * 60 * 1000
  })
  matched.sort((a, b) => (a.net ?? '9999').localeCompare(b.net ?? '9999'))
  return matched[0] ?? null
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}
