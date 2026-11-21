import type { Metadata } from 'next'
import { GlossaryText } from '@/components/glossary-text'
import { OrbitGlobe } from '@/components/orbit-globe'
import { assembleHistory } from '@/lib/history'
import { getLaunches } from '@/lib/launches'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'History',
  description: 'A short list of famous rockets and missions, each with a public source.',
}

export default async function HistoryPage() {
  const board = await getLaunches()
  const missions = assembleHistory(board.launches)
  return (
    <main id="content" className="wrap page">
      <p className="kicker">History</p>
      <h1>Flights people still talk about</h1>
      <p className="lede when-kid">A few famous rockets and trips. Each one has a public page you can open.</p>
      <p className="lede when-adult">
        Famous flights stay on this list. A completed launch already on the board is added when it is notable, such as a Starship test, a heavy rocket, or a crew flight. The date comes from that listing. A hand written story is optional. If a number is not on the cited page, it is not repeated here.
      </p>
      {missions.map((mission) => (
        <section key={mission.id} id={mission.id}>
          <p className="kicker">{mission.rocket}</p>
          <h2>{mission.name}</h2>
          <p className="meta">{mission.when}</p>
          {mission.orbit ? <OrbitGlobe spec={mission.orbit} /> : null}
          <p className="when-kid">
            <GlossaryText text={mission.kid} />
          </p>
          <p className="when-adult">
            <GlossaryText text={mission.adult} />
          </p>
          {mission.change ? (
            <>
              <h3>What changed from the last flight</h3>
              <p>
                <GlossaryText text={mission.change.note} />
              </p>
              <p className="meta">
                Source: <a href={mission.change.sourceUrl}>{mission.change.sourceTitle}</a>
              </p>
            </>
          ) : null}
          <p className="meta">
            Source: <a href={mission.sourceUrl}>{mission.sourceTitle}</a>
          </p>
        </section>
      ))}
    </main>
  )
}
