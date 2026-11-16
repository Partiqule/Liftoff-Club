import { FlightStrip } from '@/components/flight-strip'
import { TierCompare } from '@/components/tier-compare'
import Link from 'next/link'
import { SourceNote } from '@/components/source-note'
import { Tonight } from '@/components/tonight'
import { getLaunches } from '@/lib/launches'
import { isStillAhead, pickNext } from '@/lib/schedule'

export default async function HomePage() {
  const board = await getLaunches()
  const ahead = board.launches.filter((launch) => isStillAhead(launch))
  const featured = pickNext(ahead, Date.now(), (launch) => launch.featured)
  const rest = ahead.filter((launch) => launch.id !== featured?.id).slice(0, 6)
  return (
    <main id="content">
      <Tonight />
      <div className="wrap page" style={{ paddingTop: 0 }}>
        <SourceNote board={board} />
        <section>
          <div className="section-head">
            <h2>Next SpaceX</h2>
            <Link href="/launches?who=spacex">SpaceX only</Link>
          </div>
          {featured ? (
            <FlightStrip launch={featured} featured />
          ) : (
            <p className="note">
              Next launch not posted yet. <Link href="/launches">See the full schedule</Link>
            </p>
          )}
        </section>
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
        <TierCompare />
      </div>
    </main>
  )
}
