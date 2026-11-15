import type { Metadata } from 'next'
import Link from 'next/link'
import { FlightStrip } from '@/components/flight-strip'
import { SourceNote } from '@/components/source-note'
import { isLocalSite, siteUrl } from '@/lib/site'
import { webcalFeedUrl } from '@/lib/calendar'
import { getLaunches } from '@/lib/launches'
import { filterLaunches, isStillAhead } from '@/lib/schedule'

export const metadata: Metadata = {
  title: 'The board',
  description: 'Upcoming launches worldwide, with a calendar you can subscribe to when a rocket slips.',
}

export default async function LaunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; when?: string }>
}) {
  const query = await searchParams
  const who = query.who === 'spacex' || query.who === 'crew' ? query.who : undefined
  const when = query.when === 'week' ? query.when : undefined
  const board = await getLaunches()
  const filtered = filterLaunches(board.launches, { who, when })
  const ahead = filtered.filter((launch) => isStillAhead(launch))
  const recent = filtered.filter((launch) => !isStillAhead(launch))
  const base = siteUrl()
  const local = isLocalSite(base)
  const webcal = webcalFeedUrl(base)
  const httpsFeed = `${base}/calendar/feed.ics`
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Every provider · SpaceX called out</p>
      <h1>The board</h1>
      <p className="lede">
        Upcoming launches worldwide. Times refresh about once an hour, which is as often as the free launch feed allows. When a rocket slips, the calendar feed slips with it.
      </p>
      <SourceNote board={board} />
      <nav className="filters" aria-label="Filter launches">
        <Link href="/launches" aria-current={!who && !when ? 'page' : undefined}>
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
      </nav>
      {ahead.length === 0 ? <p className="note">Nothing in this filter is still ahead.</p> : null}
      <ul className="board">
        {ahead.map((launch) => (
          <li key={launch.id}>
            <FlightStrip launch={launch} />
          </li>
        ))}
      </ul>
      {recent.length > 0 ? (
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
