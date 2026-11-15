import 'server-only'

import { getEvents } from '@/lib/events'
import { getLaunches } from '@/lib/launches'
import { digestText, type DigestIssue, type DigestItem } from '@/lib/pro/digest-model'
import { loadFilings } from '@/lib/pro/filings-feed'
import { readNetLog } from '@/lib/pro/net-slip-store'
import { slipDays } from '@/lib/pro/net-slips'
import { siteUrl } from '@/lib/site'
import { isStillAhead } from '@/lib/schedule'

export async function liveDigest(now = new Date()): Promise<DigestIssue> {
  const board = await getLaunches()
  const events = await getEvents()
  const filings = await loadFilings()
  const log = await readNetLog()
  const start = now.getTime()
  const horizon = start + 7 * 86_400_000
  const launches: DigestItem[] = board.launches
    .filter((launch) => isStillAhead(launch, start) && launch.net && Date.parse(launch.net) <= horizon)
    .slice(0, 8)
    .map((launch) => ({ title: launch.name, detail: launch.rocketName, href: `/launches/${launch.id}` }))
  const tests: DigestItem[] = events.events
    .filter((event) => event.when && Date.parse(event.when) >= start && Date.parse(event.when) <= horizon)
    .slice(0, 6)
    .map((event) => ({ title: event.name, detail: event.type, href: event.infoUrl ?? event.sourceUrl }))
  const slips: DigestItem[] = Object.entries(log)
    .filter(([, record]) => slipDays(record.points).length > 0)
    .slice(0, 6)
    .map(([id, record]) => ({ title: record.name, detail: record.rocket, href: `/launches/${id}` }))
  const filingItems: DigestItem[] = filings.rows.slice(0, 5).map((row) => ({ title: row.filer, detail: row.type, href: row.url }))
  return {
    title: 'Liftoff Club Pro digest',
    windowLabel: 'The next seven days on the public board.',
    launches,
    tests,
    slips,
    filings: filingItems,
  }
}

export function liveDigestText(issue: DigestIssue): string {
  return digestText(issue, siteUrl())
}
