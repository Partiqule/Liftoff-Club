import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RocketFigure } from '@/components/rocket-figure'
import { FlightStrip } from '@/components/flight-strip'
import { EventFeed } from '@/components/event-feed'
import { eventsForRocket, getEvents } from '@/lib/events'
import { getLaunches } from '@/lib/launches'
import { isStillAhead } from '@/lib/schedule'
import { historyForRocket } from '@/lib/history'
import { starshipChangeFor } from '@/lib/starship-changes'
import { catalogRocket } from '@/lib/rocket-catalog'
import { ROCKET_CATALOG } from '@/lib/rocket-catalog'
import { ROCKET_PHOTOS, rocketId } from '@/lib/rocket-photos'

export const revalidate = 3600

export async function generateStaticParams() {
  const board = await getLaunches()
  const ids = new Set<string>([...ROCKET_PHOTOS.map((photo) => photo.id), ...ROCKET_CATALOG.map((rocket) => rocket.id)])
  for (const launch of board.launches) ids.add(rocketId(launch.rocketName))
  return [...ids].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const photo = ROCKET_PHOTOS.find((item) => item.id === slug)
  const raw = photo?.matches[0] ?? 'Rocket'
  const title = raw.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
  return {
    title,
    description: photo
      ? `${photo.alt} Photo by ${photo.author}. ${photo.license}.`
      : 'A rocket on the Liftoff Club board.',
  }
}

export default async function RocketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const board = await getLaunches()
  const events = await getEvents()
  const mine = board.launches.filter((launch) => rocketId(launch.rocketName) === slug)
  const flights = mine.filter((launch) => isStillAhead(launch))
  const flown = mine.filter((launch) => !isStillAhead(launch))
  const photo = ROCKET_PHOTOS.find((item) => item.id === slug)
  const catalog = catalogRocket(slug)
  const past = historyForRocket(slug)
  const name = flights[0]?.rocketName ?? photo?.matches[0] ?? catalog?.name ?? null
  if (!name && !photo) notFound()
  const title = flights[0]?.rocketName ?? catalog?.name ?? photo?.id.replace(/-/g, ' ') ?? 'Rocket'
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Rocket</p>
      <h1>{title}</h1>
      <RocketFigure rocketName={flights[0]?.rocketName ?? catalog?.matches[0] ?? photo?.matches[0] ?? title} />
      {catalog ? (
        <section>
          <h2>About this rocket</h2>
          <p>{catalog.summary}</p>
          <p className="meta">
            Public page: <a href={catalog.sourceUrl}>{catalog.sourceTitle}</a>. Measured figures stay on that page unless this club has copied one with a date.
          </p>
        </section>
      ) : null}
      {past.length > 0 ? (
        <section>
          <h2>Notable flights</h2>
          <ul>
            {past.map((mission) => (
              <li key={mission.id}>
                <Link href={`/history#${mission.id}`}>{mission.name}</Link>
                <span className="meta"> {mission.when}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <EventFeed events={eventsForRocket(events.events, slug)} refreshedAt={events.fetchedAt} notice={events.notice} />
      {flown.length > 0 ? (
        <section>
          <h2>Recent flights</h2>
          <ul className="board">
            {flown.slice(0, 6).map((launch) => {
              const change = starshipChangeFor(launch.name)
              return (
                <li key={launch.id}>
                  <FlightStrip launch={launch} trail={!photo} />
                  {change ? (
                    <p className="note">
                      What changed from the last flight: {change.note}{' '}
                      <a href={change.sourceUrl}>{change.sourceTitle}</a>
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
      <section>
        <h2>On the board</h2>
        {flights.length === 0 ? <p className="note">No upcoming launch on the current board uses this rocket.</p> : null}
        <ul className="board">
          {flights.map((launch) => (
            <li key={launch.id}>
              <FlightStrip launch={launch} trail={!photo} />
            </li>
          ))}
        </ul>
      </section>
      <p className="note">
        <Link href="/launches">Back to the board</Link>
      </p>
    </main>
  )
}
