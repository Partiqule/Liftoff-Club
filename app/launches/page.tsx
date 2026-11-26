import type { Metadata } from 'next'
import Link from 'next/link'
import { FlightStrip } from '@/components/flight-strip'
import { SourceNote } from '@/components/source-note'
import { isLocalSite, siteUrl } from '@/lib/site'
import { webcalFeedUrl } from '@/lib/calendar'
import { boardSlice } from '@/lib/board-window'
import { getLaunches } from '@/lib/launches'
import { getPads } from '@/lib/pads'
import { filterLaunches, isStillAhead, pickHomeLaunch } from '@/lib/schedule'

export const metadata: Metadata = {
  title: 'Launches',
  description: 'Upcoming launches worldwide, with a calendar you can subscribe to when a rocket slips.',
}

function launchesHref(filter: { who?: string; when?: string; site?: string }, offset: number): string {
  const params = new URLSearchParams()
  if (filter.who) params.set('who', filter.who)
  if (filter.when) params.set('when', filter.when)
  if (filter.site) params.set('site', filter.site)
  if (offset > 0) params.set('offset', String(offset))
  const query = params.toString()
  return query ? `/launches?${query}` : '/launches'
}

export default async function LaunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; when?: string; site?: string; offset?: string }>
}) {
  const query = await searchParams
  const who = query.who === 'spacex' || query.who === 'crew' ? query.who : undefined
  const when = query.when === 'week' ? query.when : undefined
  const site = query.site?.toLowerCase() === 'starbase' ? 'starbase' : undefined
  const offset = Number(query.offset)
  const board = await getLaunches()
  const pads = site === 'starbase' ? await getPads() : null
  const filtered = filterLaunches(board.launches, { who, when, site })
  const ahead = filtered.filter((launch) => isStillAhead(launch))
  const recent = filtered.filter((launch) => !isStillAhead(launch))
  const shown = boardSlice(ahead, offset)
  const featured = !who && !when && !site ? pickHomeLaunch(board.launches, undefined, (launch) => launch.featured) : null
  const filter = { who, when, site }
  const base = siteUrl()
  const local = isLocalSite(base)
  const webcal = webcalFeedUrl(base)
  const httpsFeed = `${base}/calendar/feed.ics`
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Upcoming</p>
      <h1>Launches</h1>
      <p className="lede">
        Every upcoming launch on the public list. Times refresh every few minutes. <Link href="/events">Tests and events</Link> sit on their own page.
      </p>
      <SourceNote board={board} />
      <nav className="filters" aria-label="Filter launches">
        <Link href="/launches" aria-current={!who && !when && !site ? 'page' : undefined}>
          All
        </Link>
        <Link href="/launches?who=spacex" aria-current={who === 'spacex' ? 'page' : undefined}>
          SpaceX
        </Link>
        <Link href="/launches?who=crew" aria-current={who === 'crew' ? 'page' : undefined}>
          People flying
        </Link>
        <Link href="/launches?when=week" aria-current={when === 'week' ? 'page' : undefined}>
          This week
        </Link>
        <Link href="/launches?site=starbase" aria-current={site === 'starbase' ? 'page' : undefined}>
          Starbase
        </Link>
      </nav>
      {site === 'starbase' ? (
        <section>
          <h2>Pads on file</h2>
          {pads?.notice ? <p className="note">{pads.notice}</p> : null}
          {pads && pads.pads.length === 0 ? <p className="note">No Starbase pad came back from the public list.</p> : null}
          <ul>
            {pads?.pads.map((pad) => (
              <li key={pad.id}>
                {pad.name}
                {pad.location ? `, ${pad.location}` : ''} · <a href={pad.sourceUrl}>Launch Library 2</a>
              </li>
            ))}
          </ul>
          <p className="meta">Pad list last refresh {pads?.fetchedAt ? `${pads.fetchedAt.slice(0, 16).replace('T', ' ')} UTC` : 'not recorded'}.</p>
        </section>
      ) : null}
      {!who && !when && !site ? (
        <section>
          <div className="section-head">
            <h2>Next SpaceX</h2>
            <Link href="/launches?who=spacex">SpaceX only</Link>
          </div>
          {featured ? (
            <FlightStrip launch={featured} featured />
          ) : (
            <p className="note">No SpaceX flight is posted yet.</p>
          )}
        </section>
      ) : null}
      {ahead.length === 0 ? <p className="note">Nothing in this filter is still ahead.</p> : null}
      <ul className="board">
        {shown.items.map((launch) => (
          <li key={launch.id}>
            <FlightStrip launch={launch} />
          </li>
        ))}
      </ul>
      {shown.prevStart != null || shown.nextStart != null ? (
        <p className="note">
          {shown.prevStart != null ? <Link href={launchesHref(filter, shown.prevStart)}>Earlier launches</Link> : null}
          {shown.prevStart != null && shown.nextStart != null ? ' · ' : null}
          {shown.nextStart != null ? <Link href={launchesHref(filter, shown.nextStart)}>More launches</Link> : null}
        </p>
      ) : null}
      {shown.start === 0 && recent.length > 0 ? (
        <section>
          <div className="section-head">
            <h2>Just happened</h2>
          </div>
          <ul className="board">
            {recent.map((launch) => (
              <li key={launch.id}>
                <FlightStrip launch={launch} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <div className="section-head">
          <h2>Subscribe</h2>
        </div>
        <p className="lede">
          Add the Liftoff Club feed to Apple Calendar, Google Calendar, or Outlook. The same launch keeps the same calendar id, so a slip updates the event instead of making a second one. Apps refresh on their own schedule, often slower than an hour.
        </p>
        {local ? (
          <p className="note">
            This copy is running on your computer, so a phone cannot subscribe to it yet. After you deploy, the link below is the one to share. You can still download any single launch.
          </p>
        ) : null}
        <div className="tickets">
          <a className="ticket" href={httpsFeed}>
            Download feed
          </a>
          <a className="ticket" href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`}>
            Google subscribe
          </a>
          <a className="ticket" href={webcal}>
            Apple subscribe
          </a>
        </div>
      </section>
    </main>
  )
}
