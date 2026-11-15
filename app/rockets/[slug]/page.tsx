import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RocketFigure } from '@/components/rocket-figure'
import { FlightStrip } from '@/components/flight-strip'
import { getLaunches } from '@/lib/launches'
import { isStillAhead } from '@/lib/schedule'
import { ROCKET_PHOTOS, rocketId } from '@/lib/rocket-photos'

export const revalidate = 3600

export async function generateStaticParams() {
  const board = await getLaunches()
  const ids = new Set<string>(ROCKET_PHOTOS.map((photo) => photo.id))
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
  const flights = board.launches.filter((launch) => rocketId(launch.rocketName) === slug && isStillAhead(launch))
  const photo = ROCKET_PHOTOS.find((item) => item.id === slug)
  const name = flights[0]?.rocketName ?? photo?.matches[0] ?? null
  if (!name && !photo) notFound()
  const title = flights[0]?.rocketName ?? photo?.id.replace(/-/g, ' ') ?? 'Rocket'
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Rocket</p>
      <h1>{title}</h1>
      <RocketFigure rocketName={flights[0]?.rocketName ?? photo?.matches[0] ?? title} />
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
