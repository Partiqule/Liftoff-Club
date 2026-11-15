import type { Metadata } from 'next'
import Link from 'next/link'
import { getConstellationCards } from '@/lib/constellations'
import { getLaunches } from '@/lib/launches'
import type { CitedFigure } from '@/lib/cited'
import type { ConstellationCounts } from '@/lib/constellation-tally'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Constellations',
  description: 'How many satellites are up, and the public plan for each constellation, with a source on every stated number.',
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

function Figure({ figure, inOrbit }: { figure: CitedFigure | null; inOrbit: number | null }) {
  if (!figure) return <p>No public figure yet.</p>
  const comparable = figure.compareToInOrbit && inOrbit != null && figure.value > 0
  const ratio = comparable ? Math.min(1, inOrbit / figure.value) : 0
  return (
    <div>
      <p>
        {figure.label}: {formatCount(figure.value)} {figure.unit}
      </p>
      {comparable ? (
        <div className="capacity-line" aria-hidden="true">
          <span style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      ) : null}
      {figure.note ? <p className="note">{figure.note}</p> : null}
      <p className="meta">
        <a href={figure.sourceUrl}>{figure.sourceTitle}</a>
        {' · as of '}
        {figure.asOf}
      </p>
    </div>
  )
}

function Counts({ counts }: { counts: ConstellationCounts | null }) {
  if (!counts) return <p className="note">The catalog did not answer, so the live count is blank.</p>
  return (
    <dl className="plate">
      <dt>Launched</dt>
      <dd>{formatCount(counts.launched)}</dd>
      <dt>In orbit</dt>
      <dd>{formatCount(counts.inOrbit)}</dd>
      <dt>Launches this year</dt>
      <dd>{formatCount(counts.launchesThisYear)}</dd>
    </dl>
  )
}

export default async function ConstellationsPage() {
  const board = await getLaunches()
  const cards = await getConstellationCards(board.launches)
  return (
    <main id="content" className="wrap page">
      <p className="kicker">From the public catalog</p>
      <h1>Constellations</h1>
      <p className="lede when-kid">How many satellites are up, and what they do. A plan number is shown only when a company or a government wrote it down.</p>
      <p className="lede when-adult">
        In orbit, launched, and launches this year come from the CelesTrak catalog. A stated size or capacity is shown only with a source and a date. If we do not have one, the line stays blank.
      </p>
      {cards.map((card) => (
        <section key={card.profile.id}>
          <h2>
            {card.profile.companySlug ? <Link href={`/companies/${card.profile.companySlug}`}>{card.profile.name}</Link> : card.profile.name}
          </h2>
          <p className="meta">{card.profile.operator}</p>
          <p className="when-kid">{card.profile.kid}</p>
          <p className="when-adult">{card.profile.adult}</p>
          <p className="when-kid">
            {card.counts ? `${formatCount(card.counts.inOrbit)} satellites are in orbit in the public catalog.` : 'The live count is not available right now.'}
          </p>
          <p className="when-kid">
            {card.profile.satellites ? (
              <>
                A public document names {formatCount(card.profile.satellites.value)} satellites.{' '}
                <a href={card.profile.satellites.sourceUrl}>{card.profile.satellites.sourceTitle}</a>
                {' · as of '}
                {card.profile.satellites.asOf}
              </>
            ) : (
              'No public figure yet for how many they plan to fly.'
            )}
          </p>
          <div className="when-adult">
            <Counts counts={card.counts} />
            {card.aheadThisYear > 0 ? <p className="note">{card.aheadThisYear} more still ahead on the board this year.</p> : null}
            <h3>Satellites in the public plan</h3>
            <Figure figure={card.profile.satellites} inOrbit={card.counts?.inOrbit ?? null} />
            <h3>Capacity</h3>
            <Figure figure={card.profile.bandwidth} inOrbit={null} />
          </div>
        </section>
      ))}
      <p className="note">Catalog counts can include spares and can lag a new launch by a day or two. They are not a promise of how many are working.</p>
    </main>
  )
}
