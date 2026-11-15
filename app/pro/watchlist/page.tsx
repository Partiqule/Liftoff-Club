import type { Metadata } from 'next'
import { WatchlistDesk } from '@/components/pro/watchlist-desk'
import { loadProBoard } from '@/lib/pro/load'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'Saved companies, constellations, rockets, and launch sites, with what changed and what is next.',
}

export default async function WatchlistPage() {
  const { board, refs, choices, now } = await loadProBoard()
  return (
    <main id="content" className="wrap page">
      <p className="kicker">Saved targets</p>
      <h1>Watchlist</h1>
      <p className="lede">
        Follow a company, a constellation, a rocket, or a launch site. The next flight is on the card. Changes show up after you mark the board seen and the public listing moves.
      </p>
      <WatchlistDesk launches={board.launches} constellations={refs} choices={choices} now={now} />
    </main>
  )
}
