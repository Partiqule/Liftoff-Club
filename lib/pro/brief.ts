import { formatMountain } from '@/lib/pro/time'
import type { TrackerSource } from '@/lib/pro/tracker'
import { trackerRows, type TrackerCell, type TrackerHistory } from '@/lib/pro/tracker'
import type { Launch } from '@/lib/types'

export type BriefFact = {
  heading: string
  text: string
  sourceUrl: string
  sourceTitle: string
  asOf: string
}

export type ProBrief = {
  title: string
  subject: string
  facts: BriefFact[]
  gaps: string[]
  talk: string[]
}

export function constellationBrief(
  source: TrackerSource,
  launches: Launch[],
  boardAsOf: string | null,
  now = Date.now(),
  history: TrackerHistory | null = null,
): ProBrief {
  const row = trackerRows([source], launches, boardAsOf, now, history)[0]
  return briefFromRow(source.name, `${source.name}, ${source.operator}`, row)
}

export function companyBrief(
  name: string,
  slug: string,
  sources: TrackerSource[],
  launches: Launch[],
  boardAsOf: string | null,
  now = Date.now(),
  history: TrackerHistory | null = null,
): ProBrief {
  const rows = trackerRows(sources, launches, boardAsOf, now, history)
  const facts: BriefFact[] = []
  const gaps: string[] = []
  if (rows.length === 0) gaps.push('No public constellation figure is tied to this company.')
  for (const row of rows) {
    pushCell(facts, gaps, row.name, 'Satellites in orbit', row.inOrbit)
    pushCell(facts, gaps, row.name, 'Launches this year', row.launchesThisYear)
    pushCell(facts, gaps, row.name, 'Authorized or planned size', row.authorized)
    pushCell(facts, gaps, row.name, 'Capacity', row.capacity)
    pushCell(facts, gaps, row.name, 'Last launch', row.lastLaunch)
    if (row.ai.text === 'Listed') pushCell(facts, gaps, row.name, 'AI in orbit', row.ai)
    else gaps.push(`${row.name}: no public note yet for a computer that runs a model on the spacecraft.`)
  }
  const ownFlights = launches.filter(
    (launch) => launch.manifest.some((item) => item.companySlug === slug) || launch.provider.companyId === slug,
  )
  const dated = boardAsOf && /^\d{4}-\d{2}-\d{2}$/.test(boardAsOf) ? boardAsOf : null
  for (const launch of ownFlights.slice(0, 5)) {
    if (!dated) break
    facts.push({
      heading: 'Upcoming on the public board',
      text: launch.net ? `${launch.name} is listed for ${formatMountain(launch.net)}.` : `${launch.name} is listed. The clock is not set.`,
      sourceUrl: 'https://thespacedevs.com/llapi',
      sourceTitle: 'Launch Library 2',
      asOf: dated,
    })
  }
  if (ownFlights.length === 0) gaps.push('No upcoming flight on the current board names this company.')
  return { title: name, subject: name, facts, gaps, talk: talkTrack(facts) }
}

export function talkTrack(facts: BriefFact[]): string[] {
  if (facts.length === 0) return ['No sourced figure is on file for this page yet.']
  return facts.slice(0, 6).map((fact) => `${fact.text} Source: ${fact.sourceTitle}, as of ${fact.asOf}.`)
}

export function numbersIn(text: string): string[] {
  return text.match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?/g) ?? []
}

/** A rewritten talk track may keep numbers that already appear in the sourced lines. */
export function talkStaysInside(lines: string[], facts: BriefFact[]): boolean {
  const allowed = new Set(facts.flatMap((fact) => numbersIn(`${fact.text} ${fact.asOf} ${fact.sourceTitle}`)))
  return lines.every((line) => numbersIn(line).every((value) => allowed.has(value)))
}

function briefFromRow(title: string, subject: string, row: ReturnType<typeof trackerRows>[number]): ProBrief {
  const facts: BriefFact[] = []
  const gaps: string[] = []
  pushCell(facts, gaps, title, 'Satellites in orbit', row.inOrbit)
  pushCell(facts, gaps, title, 'Launches this year', row.launchesThisYear)
  pushCell(facts, gaps, title, 'Authorized or planned size', row.authorized)
  pushCell(facts, gaps, title, 'Capacity', row.capacity)
    pushCell(facts, gaps, title, 'Last launch', row.lastLaunch)
  pushCell(facts, gaps, title, 'Next on the public board', row.nextLaunch)
  if (row.ai.text === 'Listed') pushCell(facts, gaps, title, 'AI in orbit', row.ai)
  else gaps.push('No public note yet for a computer that runs a model on the spacecraft.')
  return { title, subject, facts, gaps, talk: talkTrack(facts) }
}

function pushCell(facts: BriefFact[], gaps: string[], owner: string, heading: string, cell: TrackerCell) {
  if (!cell.sourceUrl || !cell.asOf || !cell.sourceTitle || cell.text === 'No public figure yet' || cell.text === 'None on the board' || cell.text === 'No public note yet') {
    if (cell.text === 'No public figure yet' || cell.text === 'No public note yet' || cell.text === 'None on the board') {
      gaps.push(`${owner}: ${heading.toLowerCase()} is ${cell.text.charAt(0).toLowerCase()}${cell.text.slice(1)}.`)
    }
    return
  }
  facts.push({
    heading,
    text: crispFact(heading, cell.text),
    sourceUrl: cell.sourceUrl,
    sourceTitle: cell.sourceTitle,
    asOf: cell.asOf,
  })
}

function crispFact(heading: string, value: string): string {
  if (heading === 'Satellites in orbit') return `${value} are in orbit.`
  if (heading === 'Launches this year') return `${value} flew this year.`
  if (heading === 'Last launch') return `The last flight was ${value}.`
  if (heading === 'Next on the public board') return `Next on the board is ${value}.`
  if (heading === 'Capacity') return `Stated capacity is ${value}.`
  if (heading === 'Authorized or planned size') return `A public plan names ${value}.`
  if (heading === 'AI in orbit') return 'A public note lists a computer that runs a model on a spacecraft.'
  if (heading === 'Upcoming on the public board') return value
  return `${heading}. ${value}`
}
