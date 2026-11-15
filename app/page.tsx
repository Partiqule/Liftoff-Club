import { FlightStrip } from '@/components/flight-strip'
import Link from 'next/link'
import { SourceNote } from '@/components/source-note'
import { Tonight } from '@/components/tonight'
import { getLaunches } from '@/lib/launches'
import { isStillAhead } from '@/lib/schedule'

export default async function HomePage() {
  const board = await getLaunches()
  const ahead = board.launches.filter((launch) => isStillAhead(launch))
  const featured = ahead.find((launch) => launch.featured)
  const rest = ahead.filter((launch) => launch.id !== featured?.id).slice(0, 6)
  return (
    <main id="content">
      <Tonight />
      <div className="wrap page" style={{ paddingTop: 0 }}>
        <SourceNote board={board} />
        {featured ? (
          <section>
            <div className="section-head">
              <h2>Next SpaceX</h2>
              <Link href="/launches?who=spacex">SpaceX only</Link>
            </div>
            <FlightStrip launch={featured} featured />
          </section>
        ) : null}
        <section>
          <div className="section-head">
            <h2>Also on the board</h2>
            <Link href="/launches">The whole board</Link>
          </div>
          {rest.length === 0 ? <p className="note">The board is empty right now. The feed may be resting.</p> : null}
          <ul className="board">
            {rest.map((launch) => (
              <li key={launch.id}>
                <FlightStrip launch={launch} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
