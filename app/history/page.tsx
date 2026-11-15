import type { Metadata } from 'next'
import { GlossaryText } from '@/components/glossary-text'
import { HISTORY } from '@/lib/history'

export const metadata: Metadata = {
  title: 'History',
  description: 'A short list of famous rockets and missions, each with a public source.',
}

export default function HistoryPage() {
  return (
    <main id="content" className="wrap page">
      <p className="kicker">History</p>
      <h1>Flights people still talk about</h1>
      <p className="lede when-kid">A few famous rockets and trips. Each one has a public page you can open.</p>
      <p className="lede when-adult">A short sourced list. It is not every flight. If a number is not on the cited page, it is not repeated here.</p>
      {HISTORY.map((mission) => (
        <section key={mission.id} id={mission.id}>
          <p className="kicker">{mission.rocket}</p>
          <h2>{mission.name}</h2>
          <p className="meta">{mission.when}</p>
          <p className="when-kid">
            <GlossaryText text={mission.kid} />
          </p>
          <p className="when-adult">
            <GlossaryText text={mission.adult} />
          </p>
          <p className="meta">
            Source: <a href={mission.sourceUrl}>{mission.sourceTitle}</a>
          </p>
        </section>
      ))}
    </main>
  )
}
